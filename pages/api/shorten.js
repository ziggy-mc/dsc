import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { connectToDatabase } from "../../lib/mongodb";
import ShortLink from "../../models/ShortLink";
import { generateCode } from "../../lib/store";
import { getUserTier, countUserLinks, getUserLimits } from "../../lib/tiers";
import {
  TIERS,
  LIMITS,
  MAX_TEMP_DAYS,
  ALLOWED_DOMAINS,
  EXPIRY_OPTIONS,
} from "../../lib/tierConstants";

/**
 * Validate that the given URL is a Discord invite link.
 * Accepts: discord.gg/<code> and discord.com/invite/<code>
 */
function isValidDiscordUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "discord.gg" && parsed.pathname.length > 1) {
      return true;
    }
    if (
      parsed.hostname === "discord.com" &&
      parsed.pathname.startsWith("/invite/") &&
      parsed.pathname.length > "/invite/".length
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Normalize a Discord invite URL to always use the discord.gg/<code> form.
 * discord.com/invite/<code> → https://discord.gg/<code>
 * discord.gg/<code>        → returned as-is (scheme normalised to https)
 */
function normalizeDiscordUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "discord.com" && parsed.pathname.startsWith("/invite/")) {
      const slug = parsed.pathname.replace("/invite/", "");
      return `https://discord.gg/${slug}`;
    }
    // Ensure https scheme for discord.gg links
    if (parsed.hostname === "discord.gg") {
      return `https://discord.gg${parsed.pathname}`;
    }
  } catch {
    // Invalid URLs are already rejected by isValidDiscordUrl before this is called;
    // fall through and return the original value unchanged.
  }
  return url;
}

/**
 * POST /api/shorten
 * Body: { url: string, domain?: string, expiresInDays?: number|null, customSlug?: string }
 * Response: { code: string, shortUrl: string }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, domain, expiresInDays, customSlug } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidDiscordUrl(url.trim())) {
    return res.status(400).json({
      error:
        "Invalid Discord invite URL. Please use a discord.gg or discord.com/invite link.",
    });
  }

  // Determine user tier
  const session = await getServerSession(req, res, authOptions);
  const discordId = session?.user?.discordId || null;
  const tier = await getUserTier(discordId);

  // Validate and resolve domain
  const allowedDomains = ALLOWED_DOMAINS[tier];
  let baseUrl;
  if (domain && allowedDomains.includes(domain)) {
    baseUrl = domain;
  } else {
    baseUrl = allowedDomains[0];
  }

  // Resolve expiration
  let expiresAt = null;
  let isPermanent = false;

  if (tier === TIERS.GUEST) {
    // Guests always get 7-day expiry
    expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  } else {
    const allowedExpiry = EXPIRY_OPTIONS[tier];
    const requestedDays = expiresInDays === null ? null : Number(expiresInDays);

    if (requestedDays === null && allowedExpiry.includes(null)) {
      isPermanent = true;
    } else if (requestedDays && allowedExpiry.includes(requestedDays)) {
      const maxDays = MAX_TEMP_DAYS[tier];
      const days = Math.min(requestedDays, maxDays);
      expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    } else {
      // Default: 7-day expiry
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  // Check per-user link limits (logged-in users only)
  if (tier !== TIERS.GUEST) {
    const counts = await countUserLinks(discordId);
    const limits = await getUserLimits(discordId, tier);

    if (counts.total >= limits.total) {
      return res.status(403).json({
        error: `You have reached your link limit (${limits.total} links). Delete some links to create new ones.`,
      });
    }

    if (isPermanent && counts.permanent >= limits.permanent) {
      return res.status(403).json({
        error: `You have reached your permanent link limit (${limits.permanent}). Use a temporary expiration instead.`,
      });
    }

    if (!isPermanent && counts.temp >= limits.temp) {
      return res.status(403).json({
        error: `You have reached your temporary link limit (${limits.temp}).`,
      });
    }
  }

  // Resolve short code
  /** Routes that must not be used as short codes */
  const RESERVED_SLUGS = new Set([
    "api", "dashboard", "_next", "favicon.ico", "404", "500",
  ]);

  let code;
  if (customSlug && tier === TIERS.PAID) {
    // Normalize to lowercase and strip invalid characters
    const slug = customSlug.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
    if (!slug || slug.length < 2 || slug.length > 32) {
      return res.status(400).json({
        error:
          "Custom slug must be between 2 and 32 characters (letters, numbers, hyphens, underscores).",
      });
    }
    if (RESERVED_SLUGS.has(slug)) {
      return res.status(400).json({
        error: "That slug is reserved and cannot be used. Please choose another.",
      });
    }
    await connectToDatabase();
    const exists = await ShortLink.exists({ code: slug });
    if (exists) {
      return res
        .status(409)
        .json({ error: "That custom slug is already taken. Please choose another." });
    }
    code = slug;
  } else {
    code = await generateCode();
  }

  try {
    await connectToDatabase();
    await ShortLink.create({
      code,
      targetUrl: normalizeDiscordUrl(url.trim()),
      ownerDiscordId: discordId,
      domain: baseUrl,
      expiresAt,
      isPermanent,
      loading: tier !== TIERS.PAID,
    });

    // Increment the user's total links created counter
    if (discordId) {
      const User = (await import("../../models/User")).default;
      await User.updateOne(
        { discordId },
        { $inc: { "shortener.totalLinksCreated": 1 } }
      );
    }

    const shortUrl = `${baseUrl}/${code}`;
    return res.status(200).json({ code, shortUrl });
  } catch (err) {
    console.error("Failed to create short link:", err);
    return res
      .status(500)
      .json({ error: "Failed to create short link. Please try again." });
  }
}

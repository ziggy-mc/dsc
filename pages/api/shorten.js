import { saveLink, generateCode } from "../../lib/store";

/** Allowed short domains the user can choose from */
const ALLOWED_DOMAINS = [
  "https://zmcdsc.vercel.app",
  "https://dscs.ziggymc.me",
];

/**
 * Validate that the given URL is a Discord invite link.
 * Accepts: discord.gg/<code> and discord.com/invite/<code>
 */
function isValidDiscordUrl(url) {
  try {
    const parsed = new URL(url);
    // Must be discord.gg with a non-empty path
    if (parsed.hostname === "discord.gg" && parsed.pathname.length > 1) {
      return true;
    }
    // Must be discord.com/invite/<code>
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
 * POST /api/shorten
 * Body: { url: string, domain?: string }
 * Response: { code: string, shortUrl: string }
 */
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url, domain } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidDiscordUrl(url.trim())) {
    return res.status(400).json({
      error:
        "Invalid Discord invite URL. Please use a discord.gg or discord.com/invite link.",
    });
  }

  // Use the provided domain if it's in the allow-list, otherwise fall back to
  // the request host so the app also works on localhost / custom deployments.
  let baseUrl;
  if (domain && ALLOWED_DOMAINS.includes(domain)) {
    baseUrl = domain;
  } else {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    baseUrl = `${protocol}://${host}`;
  }

  try {
    const code = generateCode();
    saveLink(code, url.trim());

    const shortUrl = `${baseUrl}/${code}`;
    return res.status(200).json({ code, shortUrl });
  } catch (err) {
    console.error("Failed to shorten link:", err);
    return res.status(500).json({ error: "Failed to create short link. Please try again." });
  }
}

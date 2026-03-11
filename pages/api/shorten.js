import { saveLink, generateCode } from "../../lib/store";

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
 * Body: { url: string }
 * Response: { code: string, shortUrl: string }
 */
export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { url } = req.body || {};

  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!isValidDiscordUrl(url.trim())) {
    return res.status(400).json({
      error:
        "Invalid Discord invite URL. Please use a discord.gg or discord.com/invite link.",
    });
  }

  const code = generateCode();
  saveLink(code, url.trim());

  // Build short URL from the request host header
  const protocol = req.headers["x-forwarded-proto"] || "http";
  const host = req.headers.host;
  const shortUrl = `${protocol}://${host}/${code}`;

  return res.status(200).json({ code, shortUrl });
}

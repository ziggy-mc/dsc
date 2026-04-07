import { useEffect, useState } from "react";
import Head from "next/head";
import { connectToDatabase } from "../lib/mongodb";
import ShortLink from "../models/ShortLink";
import { getLink } from "../lib/store";

const PRIMARY_DOMAIN = "https://ds.ziggymc.me";

/**
 * Returns true when the User-Agent belongs to a bot/crawler that should
 * receive an immediate redirect (Discord embed crawler, other link-preview
 * bots, search engines, etc.).
 */
const CRAWLER_UA_PATTERNS = [
  "Discordbot",
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "Slackbot",
  "TelegramBot",
  "WhatsApp",
  "Googlebot",
  "bingbot",
  "DuckDuckBot",
  "Applebot",
];
const CRAWLER_UA_RE = new RegExp(CRAWLER_UA_PATTERNS.join("|"), "i");

function isCrawler(userAgent) {
  if (!userAgent) return false;
  return CRAWLER_UA_RE.test(userAgent);
}

/**
 * Resolve a short code from the new ShortLink collection, falling back to the
 * legacy "dsc" collection for codes created before this update.
 * Returns { targetUrl, isPermanent, expiresAt, ownerDiscordId, loading } or null.
 *
 * @param {string} code - The short code to resolve.
 * @param {string} requestHostname - The hostname of the incoming request (without port),
 *   used to validate that the link belongs to the domain being accessed.
 */
async function resolveCode(code, requestHostname) {
  await connectToDatabase();

  // Find the ShortLink without updating yet so we can validate domain first.
  const sl = await ShortLink.findOne({ code }).lean();
  if (sl) {
    // Domain check: the link's stored domain must match the host that the
    // visitor is using.  Legacy docs without a domain field bypass this check.
    if (requestHostname && sl.domain) {
      let storedHostname = null;
      try {
        // Domains are stored as full URLs (e.g. "https://dscs.ziggymc.me").
        // Guard against bare hostnames that may have been stored without a
        // protocol by prepending one if needed.
        const raw = sl.domain.includes("://") ? sl.domain : `https://${sl.domain}`;
        storedHostname = new URL(raw).hostname;
      } catch {
        // If parsing fails for any reason, fall through and allow the
        // request rather than incorrectly blocking it.
        storedHostname = null;
      }
      if (storedHostname !== null && storedHostname !== requestHostname) {
        // The slug exists but was created for a different domain – treat as
        // not found so we don't leak information about other domains' links.
        return null;
      }
    }

    // Increment the visit counter only after the domain check passes.
    await ShortLink.updateOne({ code }, { $inc: { count: 1 } });

    return {
      targetUrl: sl.targetUrl,
      isPermanent: sl.isPermanent,
      expiresAt: sl.expiresAt,
      ownerDiscordId: sl.ownerDiscordId,
      loading: sl.loading !== false, // default true for legacy docs without the field
    };
  }

  // Fall back to legacy store (no domain stored, so no domain check needed).
  const legacyUrl = await getLink(code);
  if (legacyUrl) {
    return {
      targetUrl: legacyUrl,
      isPermanent: false,
      expiresAt: null,
      ownerDiscordId: null,
      loading: true,
    };
  }

  return null;
}

export async function getServerSideProps({ params, req }) {
  const { code } = params;
  const userAgent = req.headers["user-agent"] || "";

  // Extract just the hostname (no port) so we can validate it against the
  // link's stored domain (e.g. "dscs.ziggymc.me" or "zmcdsc.vercel.app").
  const requestHostname = (req.headers.host || "").split(":")[0];

  let resolved = null;
  try {
    resolved = await resolveCode(code, requestHostname);
  } catch (err) {
    console.error("Failed to resolve short code:", err);
    return {
      redirect: {
        destination: `${PRIMARY_DOMAIN}?error=notfound`,
        permanent: false,
      },
    };
  }

  if (!resolved) {
    return {
      redirect: {
        destination: `${PRIMARY_DOMAIN}?error=notfound`,
        permanent: false,
      },
    };
  }

  const { targetUrl, isPermanent, expiresAt, loading } = resolved;

  // Check expiration
  if (!isPermanent && expiresAt && new Date(expiresAt) <= new Date()) {
    // Clean up expired link
    try {
      await ShortLink.deleteOne({ code });
    } catch (delErr) {
      console.error("Failed to delete expired link:", delErr);
    }
    return {
      redirect: {
        destination: `${PRIMARY_DOMAIN}?error=expired`,
        permanent: false,
      },
    };
  }

  // Bots and crawlers (including Discord's embed bot) always get an immediate
  // redirect so they resolve the real invite URL and generate correct embeds.
  if (isCrawler(userAgent)) {
    return {
      redirect: {
        destination: targetUrl,
        permanent: false,
      },
    };
  }

  // Supporters (loading: false) get an instant redirect.
  if (!loading) {
    return {
      redirect: {
        destination: targetUrl,
        permanent: false,
      },
    };
  }

  // Guests and free users see a loading screen before being redirected.
  const delayMs = 1750;
  return {
    props: { targetUrl, delayMs },
  };
}

/** Loading screen shown to guests and free users before redirect */
export default function RedirectPage({ targetUrl, delayMs }) {
  const [dots, setDots] = useState(".");

  useEffect(() => {
    // Animated dots
    const dotInterval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."));
    }, 500);

    // Redirect after delay — attempt the Discord app deep link first, then
    // fall back to the web URL in case the app is not installed.
    const timeout = setTimeout(() => {
      const inviteMatch = targetUrl.match(
        /discord(?:\.gg|\.com\/invite)\/([A-Za-z0-9-]+)/i
      );
      if (inviteMatch) {
        // Try opening in the native Discord app.
        window.location.href = `discord://discord.gg/${inviteMatch[1]}`;
        // If the app didn't handle it (not installed), fall back to the web
        // invite page after a short delay.
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 1500);
      } else {
        window.location.href = targetUrl;
      }
    }, delayMs);

    return () => {
      clearInterval(dotInterval);
      clearTimeout(timeout);
    };
  }, [targetUrl, delayMs]);

  return (
    <>
      <Head>
        <title>Redirecting…</title>
        <meta name="robots" content="noindex" />
      </Head>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "16px",
            padding: "2.5rem 2.25rem",
            width: "100%",
            maxWidth: "400px",
            textAlign: "center",
            boxShadow:
              "0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          {/* Spinner */}
          <div
            style={{
              width: "52px",
              height: "52px",
              border: "4px solid rgba(88,101,242,0.2)",
              borderTopColor: "#5865f2",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 1.5rem",
            }}
          />
          <p
            style={{
              color: "var(--text-primary)",
              fontSize: "1.1rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Redirecting you to Discord{dots}
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem" }}>
            You&apos;ll be redirected in a moment.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: "0.78rem", marginTop: "1rem" }}>
            If you would like to create your own discord short links, create them here:{" "}
            <a
              href="https://ds.ziggymc.me"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#5865f2" }}
            >
              https://ds.ziggymc.me
            </a>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

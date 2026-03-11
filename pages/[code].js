import { useEffect, useState } from "react";
import Head from "next/head";
import { connectToDatabase } from "../lib/mongodb";
import ShortLink from "../models/ShortLink";
import { getLink } from "../lib/store";

const PRIMARY_DOMAIN = "https://dscs.ziggymc.me";

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
 */
async function resolveCode(code) {
  await connectToDatabase();

  // Check new ShortLink model first (and increment the open counter)
  const sl = await ShortLink.findOneAndUpdate(
    { code },
    { $inc: { count: 1 } },
    { new: true, lean: true }
  );
  if (sl) {
    return {
      targetUrl: sl.targetUrl,
      isPermanent: sl.isPermanent,
      expiresAt: sl.expiresAt,
      ownerDiscordId: sl.ownerDiscordId,
      loading: sl.loading !== false, // default true for legacy docs without the field
    };
  }

  // Fall back to legacy store
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

  let resolved = null;
  try {
    resolved = await resolveCode(code);
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

    // Redirect after delay
    const timeout = setTimeout(() => {
      window.location.href = targetUrl;
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
              href="https://dscs.ziggymc.me"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#5865f2" }}
            >
              https://dscs.ziggymc.me
            </a>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

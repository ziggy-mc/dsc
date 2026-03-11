import { useEffect, useState } from "react";
import Head from "next/head";
import { connectToDatabase } from "../lib/mongodb";
import ShortLink from "../models/ShortLink";
import { getLink } from "../lib/store";

const PRIMARY_DOMAIN = "https://dscs.ziggymc.me";

/**
 * Resolve a short code from new ShortLink collection, falling back to the
 * legacy "dsc" collection for codes created before this update.
 * Returns { targetUrl, isPermanent, expiresAt, ownerDiscordId } or null.
 */
async function resolveCode(code) {
  await connectToDatabase();

  // Check new ShortLink model first
  const sl = await ShortLink.findOne({ code }).lean();
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

export async function getServerSideProps({ params, req, res }) {
  const { code } = params;

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

  // Supporters (loading: false) get an instant redirect; guests/free users see a loading screen
  if (!loading) {
    return {
      redirect: {
        destination: targetUrl,
        permanent: false,
      },
    };
  }

  // Guests and free users see a loading screen
  const delayMs = 1750;
  const shortUrl = `${PRIMARY_DOMAIN}/${code}`;
  return {
    props: { targetUrl, delayMs, shortUrl },
  };
}

const INVITE_PAGE_TITLE = "Invite - Discord Link Shortener";
const INVITE_PAGE_DESCRIPTION = `Go to ${PRIMARY_DOMAIN} to shorten your invite link for free`;

/** Loading screen shown to guests and free users before redirect */
export default function RedirectPage({ targetUrl, delayMs, shortUrl }) {
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
        <title>{INVITE_PAGE_TITLE}</title>
        <meta name="robots" content="noindex" />
        <meta name="description" content={INVITE_PAGE_DESCRIPTION} />
        <meta property="og:title" content={INVITE_PAGE_TITLE} />
        <meta property="og:description" content={INVITE_PAGE_DESCRIPTION} />
        <meta property="og:url" content={shortUrl} />
        <meta property="og:type" content="website" />
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
            You&apos;ll be taken there in a moment.
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

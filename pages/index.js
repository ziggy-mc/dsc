import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "../styles/Home.module.css";

/** The Vercel deployment domain that should redirect to the primary domain */
const VERCEL_DOMAIN = "zmcdsc.vercel.app";

/** The primary domain where the UI lives */
const PRIMARY_DOMAIN = "https://dscs.ziggymc.me";

/**
 * Redirect visitors on the Vercel domain to the primary domain, and pass
 * through any error state from short-code resolution.
 */
export function getServerSideProps({ req, query }) {
  const host = req.headers.host;

  // Redirect bare visits to zmcdsc.vercel.app → primary domain
  if (host === VERCEL_DOMAIN) {
    return {
      redirect: {
        destination: PRIMARY_DOMAIN,
        permanent: false,
      },
    };
  }

  const initialError =
    query.error === "notfound"
      ? "Short URL doesn't exist"
      : query.error === "expired"
      ? "This short link has expired."
      : null;

  return {
    props: { initialError },
  };
}

/** Error notification box */
function ErrorNotification({ message, onClose }) {
  return (
    <div className={styles.errorNotification} role="alert">
      <svg
        className={styles.errorNotificationBgIcon}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          fill="currentColor"
          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
        />
      </svg>
      <span className={styles.errorNotificationText}>{message}</span>
      <button
        className={styles.errorNotificationClose}
        onClick={onClose}
        aria-label="Dismiss error"
      >
        ✕
      </button>
    </div>
  );
}

/** Discord logo SVG */
function DiscordIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 127.14 96.36"
      width="36"
      height="36"
      aria-hidden="true"
    >
      <path
        fill="#5865F2"
        d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
      />
    </svg>
  );
}

/** Spinner */
function Spinner() {
  return <span className={styles.spinner} aria-label="Loading" />;
}

/** Extract invite code from a Discord URL for preview */
function extractInviteCode(inputUrl) {
  try {
    const parsed = new URL(inputUrl);
    if (parsed.hostname === "discord.gg") {
      return parsed.pathname.replace(/^\//, "");
    }
    if (
      parsed.hostname === "discord.com" &&
      parsed.pathname.startsWith("/invite/")
    ) {
      return parsed.pathname.replace("/invite/", "");
    }
  } catch {
    // Not a valid URL yet
  }
  return "";
}

const DOMAINS_FREE = ["https://zmcdsc.vercel.app"];
const DOMAINS_PAID = ["https://zmcdsc.vercel.app", "https://dscs.ziggymc.me"];

export default function Home({ initialError }) {
  const { data: session, status } = useSession();

  const [url, setUrl] = useState("");
  const [domain, setDomain] = useState(DOMAINS_FREE[0]);
  const [expiresInDays, setExpiresInDays] = useState("7");
  const [customSlug, setCustomSlug] = useState("");
  const [shortLink, setShortLink] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [notFoundError, setNotFoundError] = useState(initialError || "");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  // Per-user tier info fetched from /api/me
  const [tierInfo, setTierInfo] = useState(null);

  useEffect(() => {
    if (status !== "loading") {
      fetch("/api/me")
        .then((r) => r.json())
        .then((data) => setTierInfo(data))
        .catch(() => setTierInfo({ loggedIn: false, tier: "guest" }));
    }
  }, [status, session]);

  const tier = tierInfo?.tier || "guest";
  const isGuest = tier === "guest";
  const isFree = tier === "free";
  const isPaid = tier === "paid";

  const availableDomains = isPaid ? DOMAINS_PAID : DOMAINS_FREE;

  const expiryOptions = isPaid
    ? [
        { label: "7 days", value: "7" },
        { label: "30 days", value: "30" },
        { label: "90 days", value: "90" },
        { label: "180 days", value: "180" },
        { label: "Permanent", value: "permanent" },
      ]
    : isFree
    ? [
        { label: "7 days", value: "7" },
        { label: "30 days", value: "30" },
        { label: "90 days", value: "90" },
      ]
    : [{ label: "7 days (guest limit)", value: "7" }];

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    setError("");
    setShortLink("");
    setInviteCode(extractInviteCode(value));
  };

  const handleShorten = async () => {
    if (!url) return;
    setError("");
    setShortLink("");
    setLoading(true);

    try {
      const body = {
        url: url.trim(),
        domain,
        expiresInDays: expiresInDays === "permanent" ? null : Number(expiresInDays),
      };
      if (isPaid && customSlug.trim()) {
        body.customSlug = customSlug.trim();
      }

      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setShortLink(data.shortUrl);
        showToast("✅ Short link created!");
        // Refresh tier info to update link counts
        fetch("/api/me")
          .then((r) => r.json())
          .then((d) => setTierInfo(d));
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleShorten();
  };

  const handleCopy = () => {
    if (!shortLink) return;
    navigator.clipboard.writeText(shortLink).then(() => {
      setCopied(true);
      showToast("📋 Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <Head>
        <title>Discord Invite Shortener</title>
        <meta
          name="description"
          content="Shorten your Discord invite links instantly. Clean, fast, free."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <div className={styles.card}>
          {/* ── Header ── */}
          <div className={styles.header}>
            <DiscordIcon />
            <h1 className={styles.title}>Discord Invite Shortener</h1>
          </div>

          {/* ── Auth Bar ── */}
          <div className={styles.authBar}>
            {status === "loading" ? null : session ? (
              <div className={styles.authUser}>
                {session.user?.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt=""
                    className={styles.authAvatar}
                  />
                )}
                <span className={styles.authName}>
                  {session.user?.name}
                  {isPaid && (
                    <span className={styles.badgePaid}>⚡ Supporter</span>
                  )}
                  {isFree && (
                    <span className={styles.badgeFree}>Free</span>
                  )}
                </span>
                <div className={styles.authLinks}>
                  <Link href="/dashboard" className={styles.authLink}>
                    Dashboard
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className={styles.authSignOut}
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => signIn("discord")}
                className={styles.loginButton}
              >
                <DiscordIcon />
                Login with Discord
              </button>
            )}
          </div>

          <p className={styles.subtitle}>
            Paste a Discord invite link below to generate a short, shareable URL.
          </p>

          {/* ── Guest notice ── */}
          {isGuest && (
            <div className={styles.guestNotice} role="note">
              Guest links expire after 7 days.{" "}
              <button
                onClick={() => signIn("discord")}
                className={styles.guestNoticeLink}
              >
                Log in
              </button>{" "}
              for more options.
            </div>
          )}

          {/* ── Free user link counts ── */}
          {(isFree || isPaid) && tierInfo?.counts && (
            <div className={styles.tierInfo}>
              <span>
                Links: {tierInfo.counts.total} / {tierInfo.limits.total}
              </span>
              <span>
                Permanent: {tierInfo.counts.permanent} / {tierInfo.limits.permanent}
              </span>
            </div>
          )}

          {/* ── Not-Found Error Notification ── */}
          {notFoundError && (
            <ErrorNotification
              message={notFoundError}
              onClose={() => setNotFoundError("")}
            />
          )}

          {/* ── URL Input ── */}
          <div className={styles.inputGroup}>
            <input
              type="url"
              value={url}
              onChange={handleUrlChange}
              onKeyDown={handleKeyDown}
              placeholder="https://discord.gg/yourcode"
              className={styles.input}
              aria-label="Discord invite URL"
              autoComplete="off"
              spellCheck={false}
            />

            {inviteCode && (
              <div className={styles.preview}>
                <span className={styles.previewLabel}>Detected invite:</span>
                <span className={styles.previewCode}>{inviteCode}</span>
              </div>
            )}
          </div>

          {/* ── Domain Selector (paid only) ── */}
          {isPaid && (
            <div className={styles.domainGroup}>
              <label htmlFor="domain-select" className={styles.domainLabel}>
                Short domain
              </label>
              <select
                id="domain-select"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className={styles.domainSelect}
                aria-label="Choose short domain"
              >
                {availableDomains.map((d) => (
                  <option key={d} value={d}>
                    {d.replace("https://", "")}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ── Expiration Selector ── */}
          <div className={styles.domainGroup}>
            <label htmlFor="expiry-select" className={styles.domainLabel}>
              Expires
            </label>
            <select
              id="expiry-select"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
              className={styles.domainSelect}
              disabled={isGuest}
              aria-label="Choose expiration"
            >
              {expiryOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Custom Slug (paid only, blurred + disabled for free) ── */}
          <div className={styles.inputGroup}>
            <label className={styles.domainLabel} style={{ display: "block", marginBottom: "0.4rem" }}>
              Custom slug{" "}
              {!isPaid && (
                <span className={styles.badgePaid} style={{ fontSize: "0.72rem" }}>
                  Supporter only
                </span>
              )}
            </label>
            <input
              type="text"
              value={isPaid ? customSlug : ""}
              onChange={isPaid ? (e) => setCustomSlug(e.target.value) : undefined}
              placeholder={isPaid ? "my-custom-slug (optional)" : "upgrade to customize"}
              className={`${styles.input} ${!isPaid ? styles.inputBlurred : ""}`}
              aria-label="Custom slug"
              disabled={!isPaid}
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          {/* ── Error Message ── */}
          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          {/* ── Submit Button ── */}
          <button
            onClick={handleShorten}
            disabled={loading || !url.trim()}
            className={styles.button}
          >
            {loading ? <Spinner /> : "Shorten Link"}
          </button>

          {/* ── Short Link Result ── */}
          {shortLink && (
            <div className={styles.result}>
              <a
                href={shortLink}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shortLink}
              >
                {shortLink}
              </a>
              <button
                onClick={handleCopy}
                className={`${styles.copyButton} ${
                  copied ? styles.copyButtonCopied : ""
                }`}
                aria-label="Copy short link"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {/* ── Footer ── */}
      <footer className={styles.footer}>Service provided by ziggymc</footer>
    </>
  );
}

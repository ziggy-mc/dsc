import { useState, useEffect } from "react";
import Head from "next/head";
import { useSession, signIn } from "next-auth/react";
import Layout from "../components/Layout";
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
    <Layout>
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
          <h1 className={styles.title}>Shorten your invite</h1>
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
                Log in with Discord
              </button>{" "}
              for more options.
            </div>
          )}

          {/* ── Link usage counts ── */}
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
            <label className={styles.fieldLabel} htmlFor="invite-url">
              Discord Invite URL
            </label>
            <input
              id="invite-url"
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

          {/* ── Domain Selector ── */}
          <div className={styles.domainGroup}>
            <label className={styles.fieldLabel} htmlFor="domain-select">
              Short domain
            </label>
            {!isPaid ? (
              <>
                <select
                  id="domain-select"
                  value={domain}
                  className={styles.domainSelect}
                  disabled
                  aria-label="Choose short domain"
                >
                  {DOMAINS_FREE.map((d) => (
                    <option key={d} value={d}>
                      {d.replace("https://", "")}
                    </option>
                  ))}
                </select>
                <p className={styles.fieldHelper}>
                  Custom domains are available for Supporter accounts.
                </p>
              </>
            ) : (
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
            )}
          </div>

          {/* ── Expiration Selector ── */}
          <div className={styles.domainGroup}>
            <label className={styles.fieldLabel} htmlFor="expiry-select">
              Expiration
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
            {isGuest && (
              <p className={styles.fieldHelper}>
                Log in to choose a longer expiration period.
              </p>
            )}
          </div>

          {/* ── Custom Slug ── */}
          <div className={styles.inputGroup}>
            <label className={styles.fieldLabel}>
              Custom slug
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
            {!isPaid && (
              <p className={styles.fieldHelper}>
                Custom slugs are available for Supporter accounts only.
              </p>
            )}
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
    </Layout>
  );
}

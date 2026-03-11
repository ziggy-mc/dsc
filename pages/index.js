import { useState } from "react";
import Head from "next/head";
import styles from "../styles/Home.module.css";

/** Discord logo SVG (official brand asset) */
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

/** Spinner shown inside the button while a request is in-flight */
function Spinner() {
  return <span className={styles.spinner} aria-label="Loading" />;
}

/** Extract the invite code segment from a Discord URL for the preview badge */
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
    // Not a valid URL yet — that's fine while the user is still typing
  }
  return "";
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [shortLink, setShortLink] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState("");

  /** Show a temporary toast notification */
  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(""), 3000);
  };

  /** Update URL state and live-extract the invite code for preview */
  const handleUrlChange = (e) => {
    const value = e.target.value;
    setUrl(value);
    setError("");
    setShortLink("");
    setInviteCode(extractInviteCode(value));
  };

  /** Submit the URL to the API and store the returned short link */
  const handleShorten = async () => {
    if (!url) return;
    setError("");
    setShortLink("");
    setLoading(true);

    try {
      const res = await fetch("/api/shorten", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
      } else {
        setShortLink(data.shortUrl);
        showToast("✅ Short link created!");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  /** Allow submitting with the Enter key */
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleShorten();
  };

  /** Copy the short link to the clipboard */
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

          <p className={styles.subtitle}>
            Paste a Discord invite link below to generate a short, shareable URL.
          </p>

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

            {/* Live invite-code preview badge */}
            {inviteCode && (
              <div className={styles.preview}>
                <span className={styles.previewLabel}>Detected invite:</span>
                <span className={styles.previewCode}>{inviteCode}</span>
              </div>
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

      {/* ── Toast Notification ── */}
      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {/* ── Footer ── */}
      <footer className={styles.footer}>Discord Invite Shortener</footer>
    </>
  );
}

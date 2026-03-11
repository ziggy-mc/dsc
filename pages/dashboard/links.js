import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { connectToDatabase } from "../../lib/mongodb";
import ShortLink from "../../models/ShortLink";
import Layout from "../../components/Layout";
import { HomeIcon, LinkIcon, ScissorsIcon, InfinityIcon } from "../../components/Icons";
import styles from "../../styles/Dashboard.module.css";

export async function getServerSideProps({ req, res }) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return { redirect: { destination: "/", permanent: false } };
  }

  await connectToDatabase();
  const now = new Date();
  const rawLinks = await ShortLink.find({
    ownerDiscordId: session.user.discordId,
  })
    .sort({ createdAt: -1 })
    .lean();

  const links = rawLinks.map((l) => ({
    id: l._id.toString(),
    code: l.code,
    targetUrl: l.targetUrl,
    domain: l.domain,
    isPermanent: l.isPermanent,
    count: l.count ?? 0,
    createdAt: l.createdAt ? l.createdAt.toISOString() : null,
    expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
    expired:
      !l.isPermanent && l.expiresAt ? new Date(l.expiresAt) <= now : false,
  }));

  return { props: { links } };
}

function timeRemaining(expiresAt) {
  if (!expiresAt) return "—";
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return "Expired";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 0) return `${days}d`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}h`;
  return "<1h";
}

export default function LinksPage({ links: initialLinks }) {
  const [links, setLinks] = useState(initialLinks);
  const [deleting, setDeleting] = useState(null);
  const [error, setError] = useState("");

  const handleDelete = async (id) => {
    if (!confirm("Delete this link? This cannot be undone.")) return;
    setDeleting(id);
    setError("");
    try {
      const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Failed to delete link.");
      } else {
        setLinks((prev) => prev.filter((l) => l.id !== id));
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Layout>
      <Head>
        <title>My Links – Discord Invite Shortener</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.layout}>
        {/* Sidebar */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <span className={styles.sidebarBrandText}>Dashboard</span>
          </div>
          <Link href="/dashboard" className={styles.navLink}>
            <HomeIcon /> Overview
          </Link>
          <Link href="/dashboard/links" className={`${styles.navLink} ${styles.navLinkActive}`}>
            <LinkIcon /> My Links
          </Link>
          <Link href="/" className={styles.navLink}>
            <ScissorsIcon /> Create Link
          </Link>
        </nav>

        {/* Main */}
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>My Links</h1>
            <Link href="/" className={styles.actionButton}>
              + Create New
            </Link>
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          {links.length === 0 ? (
            <div className={styles.emptyState}>
              <p>You haven&apos;t created any links yet.</p>
              <Link href="/" className={styles.actionButton}>
                Create your first link
              </Link>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Short URL</th>
                    <th>Destination</th>
                    <th>Opens</th>
                    <th>Created</th>
                    <th>Expiration</th>
                    <th>Time Remaining</th>
                    <th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => (
                    <tr
                      key={link.id}
                      className={link.expired ? styles.rowExpired : ""}
                    >
                      <td>
                        <a
                          href={`${link.domain}/${link.code}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkCell}
                        >
                          {link.domain.replace("https://", "")}/{link.code}
                        </a>
                      </td>
                      <td className={styles.targetCell}>
                        <span title={link.targetUrl}>
                          {link.targetUrl.length > 36
                            ? link.targetUrl.slice(0, 34) + "…"
                            : link.targetUrl}
                        </span>
                      </td>
                      <td>{link.count}</td>
                      <td>
                        {link.createdAt
                          ? new Date(link.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {link.isPermanent
                          ? "Permanent"
                          : link.expiresAt
                          ? new Date(link.expiresAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        {link.isPermanent
                          ? <InfinityIcon width={16} height={16} style={{ verticalAlign: "middle" }} />
                          : timeRemaining(link.expiresAt)}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(link.id)}
                          disabled={deleting === link.id}
                          className={styles.deleteButton}
                          aria-label={`Delete link ${link.code}`}
                        >
                          {deleting === link.id ? "…" : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}

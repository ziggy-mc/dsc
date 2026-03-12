import { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { connectToDatabase } from "../../lib/mongodb";
import ShortLink from "../../models/ShortLink";
import User from "../../models/User";
import Layout from "../../components/Layout";
import styles from "../../styles/Admin.module.css";

const ADMIN_DISCORD_ID = "794228666518339604";

function extractInviteCode(url) {
  if (!url) return null;
  const match = url.match(/discord\.(?:gg|com\/invite)\/([a-zA-Z0-9-]+)/i);
  return match ? match[1] : null;
}

export async function getServerSideProps({ req, res, query }) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return { redirect: { destination: "/", permanent: false } };
  }

  await connectToDatabase();

  const filterDiscordId = query.user || null;
  const filter = filterDiscordId ? { ownerDiscordId: filterDiscordId } : {};

  const links = await ShortLink.find(filter).sort({ createdAt: -1 }).lean();

  // Gather unique owner IDs to resolve usernames
  const ownerIds = [...new Set(links.map((l) => l.ownerDiscordId).filter(Boolean))];
  const users = await User.find({ discordId: { $in: ownerIds } })
    .select("discordId discordUsername")
    .lean();
  const usernameMap = {};
  users.forEach((u) => {
    usernameMap[u.discordId] = u.discordUsername;
  });

  let filterUsername = null;
  if (filterDiscordId && usernameMap[filterDiscordId]) {
    filterUsername = usernameMap[filterDiscordId];
  }

  return {
    props: {
      initialLinks: links.map((l) => ({
        ...l,
        _id: l._id.toString(),
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
        expiresAt: l.expiresAt ? new Date(l.expiresAt).toISOString() : null,
        ownerUsername: l.ownerDiscordId ? (usernameMap[l.ownerDiscordId] || null) : null,
      })),
      filterDiscordId,
      filterUsername,
    },
  };
}

export default function AdminLinksPage({ initialLinks, filterDiscordId, filterUsername }) {
  const router = useRouter();
  const [links, setLinks] = useState(initialLinks);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [inviteInfo, setInviteInfo] = useState({});

  // Fetch Discord invite info for each link client-side
  useEffect(() => {
    links.forEach((link) => {
      const code = extractInviteCode(link.targetUrl);
      if (code && !(link._id in inviteInfo)) {
        fetch(`/api/admin/discord-invite?code=${encodeURIComponent(code)}`)
          .then((r) => r.json())
          .then((data) => {
            setInviteInfo((prev) => ({ ...prev, [link._id]: data }));
          })
          .catch(() => {});
      }
    });
  // Run whenever the links array changes (e.g. after filtering); inviteInfo is
  // read only to skip already-fetched IDs so we don't need it as a dep here.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [links]);

  const handleDelete = async (linkId) => {
    if (!confirm("Delete this link? This cannot be undone.")) return;
    setError("");
    setLoadingId(linkId);

    try {
      const res = await fetch("/api/admin/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", linkId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Delete failed.");
      } else {
        setLinks((prev) => prev.filter((l) => l._id !== linkId));
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoadingId(null);
    }
  };

  const clearFilter = () => {
    router.push("/admin/links");
  };

  return (
    <Layout>
      <Head>
        <title>Admin – Links – Discord Invite Shortener</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.layout}>
        <nav className={styles.sidebar}>
          <div className={styles.sidebarBrand}>Admin Panel</div>
          <Link href="/admin" className={styles.navLink}>
            Overview
          </Link>
          <Link href="/admin/links" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Links
          </Link>
          <Link href="/admin/reports" className={styles.navLink}>
            Reports
          </Link>
          <Link href="/admin/accounts" className={styles.navLink}>
            Accounts
          </Link>
          <Link href="/admin/refer" className={styles.navLink}>
            Refer Codes
          </Link>
        </nav>

        <nav className={styles.mobileNav}>
          <Link href="/admin" className={styles.navLink}>
            Overview
          </Link>
          <Link href="/admin/links" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Links
          </Link>
          <Link href="/admin/reports" className={styles.navLink}>
            Reports
          </Link>
          <Link href="/admin/accounts" className={styles.navLink}>
            Accounts
          </Link>
          <Link href="/admin/refer" className={styles.navLink}>
            Refer Codes
          </Link>
        </nav>

        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>
              Links
              {filterDiscordId && filterUsername && (
                <span className={styles.filterLabel}> — {filterUsername}</span>
              )}
              {filterDiscordId && !filterUsername && (
                <span className={styles.filterLabel}> — {filterDiscordId}</span>
              )}
            </h1>
            <span className={styles.badge}>{links.length} total</span>
            {filterDiscordId && (
              <button onClick={clearFilter} className={styles.clearFilterButton}>
                Clear filter
              </button>
            )}
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          {links.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No links found.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Short Link</th>
                    <th>Target URL / Server</th>
                    <th>Owner</th>
                    <th>Type</th>
                    <th>Created</th>
                    <th>Clicks</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {links.map((link) => {
                    const info = inviteInfo[link._id];
                    return (
                      <tr key={link._id}>
                        <td className={styles.monoCell}>
                          {link.domain}/{link.code}
                        </td>
                        <td className={styles.reasonCell}>
                          <a
                            href={link.targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkCell}
                            title={link.targetUrl}
                          >
                            {link.targetUrl}
                          </a>
                          {info && (info.serverName || info.serverDescription) && (
                            <div className={styles.serverMeta}>
                              {info.serverName && (
                                <span className={styles.serverName}>{info.serverName}</span>
                              )}
                              {info.serverDescription && (
                                <span className={styles.serverDescription}>
                                  {info.serverDescription}
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td>
                          {link.ownerDiscordId ? (
                            <button
                              onClick={() =>
                                router.push(`/admin/links?user=${link.ownerDiscordId}`)
                              }
                              className={styles.userFilterButton}
                              title={`Filter by ${link.ownerDiscordId}`}
                            >
                              {link.ownerUsername || link.ownerDiscordId}
                            </button>
                          ) : (
                            <span className={styles.guestLabel}>Guest</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={
                              link.isPermanent ? styles.statusActive : styles.typeTempBadge
                            }
                          >
                            {link.isPermanent ? "Permanent" : "Temporary"}
                          </span>
                        </td>
                        <td className={styles.dateCell}>
                          {link.createdAt
                            ? new Date(link.createdAt).toLocaleDateString()
                            : "—"}
                        </td>
                        <td>{link.count ?? 0}</td>
                        <td>
                          <button
                            onClick={() => handleDelete(link._id)}
                            disabled={loadingId === link._id}
                            className={styles.removeButton}
                          >
                            {loadingId === link._id ? "…" : "Delete"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}

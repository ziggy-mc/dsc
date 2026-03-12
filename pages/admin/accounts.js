import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { connectToDatabase } from "../../lib/mongodb";
import User from "../../models/User";
import Layout from "../../components/Layout";
import styles from "../../styles/Admin.module.css";

const ADMIN_DISCORD_ID = "794228666518339604";

export async function getServerSideProps({ req, res }) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return { redirect: { destination: "/", permanent: false } };
  }

  await connectToDatabase();
  const users = await User.find()
    .select("discordId discordUsername createdAt suspended")
    .sort({ createdAt: -1 })
    .lean();

  return {
    props: {
      initialUsers: users.map((u) => ({
        ...u,
        _id: u._id.toString(),
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : null,
        suspended: u.suspended || false,
      })),
    },
  };
}

export default function AdminAccountsPage({ initialUsers }) {
  const [users, setUsers] = useState(initialUsers);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");

  const handleToggleSuspend = async (discordId, currentlySuspended) => {
    const action = currentlySuspended ? "unsuspend" : "suspend";
    setError("");
    setLoadingId(`${discordId}:${action}`);

    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, discordId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Action failed.");
      } else {
        setUsers((prev) =>
          prev.map((u) =>
            u.discordId === discordId
              ? { ...u, suspended: !currentlySuspended }
              : u
          )
        );
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteAccount = async (discordId, username) => {
    if (
      !confirm(
        `Delete account for ${username || discordId}?\n\nThis will disable their shortener and delete all their links. They can still re-register. This cannot be undone.`
      )
    )
      return;
    setError("");
    setLoadingId(`${discordId}:delete`);

    try {
      const res = await fetch("/api/admin/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteAccount", discordId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Delete failed.");
      } else {
        setUsers((prev) => prev.filter((u) => u.discordId !== discordId));
      }
    } catch {
      setError("Network error.");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Admin – Accounts – Discord Invite Shortener</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.layout}>
        <nav className={styles.sidebar}>
          <div className={styles.sidebarBrand}>Admin Panel</div>
          <Link href="/admin" className={styles.navLink}>
            Overview
          </Link>
          <Link href="/admin/links" className={styles.navLink}>
            Links
          </Link>
          <Link href="/admin/reports" className={styles.navLink}>
            Reports
          </Link>
          <Link href="/admin/accounts" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Accounts
          </Link>
          <Link href="/admin/refer" className={styles.navLink}>
            Refer Codes
          </Link>
        </nav>

        {/* Mobile nav (shown on small screens instead of sidebar) */}
        <nav className={styles.mobileNav}>
          <Link href="/admin" className={styles.navLink}>
            Overview
          </Link>
          <Link href="/admin/links" className={styles.navLink}>
            Links
          </Link>
          <Link href="/admin/reports" className={styles.navLink}>
            Reports
          </Link>
          <Link href="/admin/accounts" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Accounts
          </Link>
          <Link href="/admin/refer" className={styles.navLink}>
            Refer Codes
          </Link>
        </nav>

        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Accounts</h1>
            <span className={styles.badge}>{users.length} total</span>
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          {users.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No accounts found.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Discord Username</th>
                    <th>Discord ID</th>
                    <th>Account Created</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id} className={user.suspended ? styles.suspendedRow : ""}>
                      <td>{user.discordUsername}</td>
                      <td className={styles.monoCell}>{user.discordId}</td>
                      <td className={styles.dateCell}>
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <span
                          className={
                            user.suspended ? styles.statusSuspended : styles.statusActive
                          }
                        >
                          {user.suspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          onClick={() =>
                            handleToggleSuspend(user.discordId, user.suspended)
                          }
                          disabled={!!loadingId}
                          className={
                            user.suspended
                              ? styles.unsuspendButton
                              : styles.suspendButton
                          }
                        >
                          {loadingId === `${user.discordId}:${user.suspended ? "unsuspend" : "suspend"}`
                            ? "…"
                            : user.suspended
                            ? "Unsuspend"
                            : "Suspend"}
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteAccount(user.discordId, user.discordUsername)
                          }
                          disabled={!!loadingId}
                          className={styles.removeButton}
                        >
                          {loadingId === `${user.discordId}:delete` ? "…" : "Delete"}
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

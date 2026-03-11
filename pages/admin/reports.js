import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { connectToDatabase } from "../../lib/mongodb";
import DSReport from "../../models/DSReport";
import Layout from "../../components/Layout";
import styles from "../../styles/Admin.module.css";

const ADMIN_DISCORD_ID = "794228666518339604";

export async function getServerSideProps({ req, res }) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return { redirect: { destination: "/", permanent: false } };
  }

  await connectToDatabase();
  const reports = await DSReport.find().sort({ createdAt: -1 }).lean();

  return {
    props: {
      initialReports: reports.map((r) => ({
        ...r,
        _id: r._id.toString(),
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      })),
    },
  };
}

export default function AdminReportsPage({ initialReports }) {
  const [reports, setReports] = useState(initialReports);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");

  const handleAction = async (reportId, action) => {
    setError("");
    setLoadingId(reportId + action);

    try {
      const res = await fetch("/api/admin/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reportId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Action failed.");
      } else {
        setReports((prev) => prev.filter((r) => r._id !== reportId));
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
        <title>Admin – Reports – Discord Invite Shortener</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.layout}>
        <nav className={styles.sidebar}>
          <div className={styles.sidebarBrand}>Admin Panel</div>
          <Link href="/admin/reports" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Reports
          </Link>
          <Link href="/admin/accounts" className={styles.navLink}>
            Accounts
          </Link>
        </nav>

        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Reports</h1>
            <span className={styles.badge}>{reports.length} open</span>
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}

          {reports.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No reports to review.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Reporter</th>
                    <th>Discord ID</th>
                    <th>Reported Link</th>
                    <th>Reason</th>
                    <th>Image</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report._id}>
                      <td>{report.reporterUsername}</td>
                      <td className={styles.monoCell}>{report.reporterDiscordId}</td>
                      <td>
                        <a
                          href={report.reportedLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.linkCell}
                        >
                          {report.reportedLink}
                        </a>
                      </td>
                      <td className={styles.reasonCell}>{report.reason}</td>
                      <td>
                        {report.imageUrl ? (
                          <a
                            href={report.imageUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.imageLink}
                          >
                            View
                          </a>
                        ) : (
                          <span className={styles.noImage}>—</span>
                        )}
                      </td>
                      <td className={styles.dateCell}>
                        {report.createdAt
                          ? new Date(report.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td className={styles.actionsCell}>
                        <button
                          onClick={() => handleAction(report._id, "dismiss")}
                          disabled={!!loadingId}
                          className={styles.dismissButton}
                        >
                          {loadingId === report._id + "dismiss"
                            ? "…"
                            : "Dismiss"}
                        </button>
                        <button
                          onClick={() => handleAction(report._id, "removeLink")}
                          disabled={!!loadingId}
                          className={styles.removeButton}
                        >
                          {loadingId === report._id + "removeLink"
                            ? "…"
                            : "Remove Link"}
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

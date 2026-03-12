import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { connectToDatabase } from "../../lib/mongodb";
import User from "../../models/User";
import ShortLink from "../../models/ShortLink";
import Supporter from "../../models/Supporter";
import Layout from "../../components/Layout";
import styles from "../../styles/Admin.module.css";

const ADMIN_DISCORD_ID = "794228666518339604";

export async function getServerSideProps({ req, res }) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return { redirect: { destination: "/", permanent: false } };
  }

  await connectToDatabase();

  const [totalUsers, paidUsers, totalLinks, permLinks] = await Promise.all([
    User.countDocuments(),
    Supporter.countDocuments(),
    ShortLink.countDocuments(),
    ShortLink.countDocuments({ isPermanent: true }),
  ]);

  return {
    props: {
      stats: {
        totalUsers,
        paidUsers,
        freeUsers: Math.max(0, totalUsers - paidUsers),
        totalLinks,
        permLinks,
        tempLinks: totalLinks - permLinks,
      },
    },
  };
}

export default function AdminOverviewPage({ stats }) {
  return (
    <Layout>
      <Head>
        <title>Admin – Overview – Discord Invite Shortener</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.layout}>
        <nav className={styles.sidebar}>
          <div className={styles.sidebarBrand}>Admin Panel</div>
          <Link href="/admin" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Overview
          </Link>
          <Link href="/admin/links" className={styles.navLink}>
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
          <Link href="/admin" className={`${styles.navLink} ${styles.navLinkActive}`}>
            Overview
          </Link>
          <Link href="/admin/links" className={styles.navLink}>
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
            <h1 className={styles.pageTitle}>Overview</h1>
          </div>

          <h2 className={styles.sectionHeading}>Users</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.paidUsers}</div>
              <div className={styles.statLabel}>Paid Members</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.freeUsers}</div>
              <div className={styles.statLabel}>Free Users</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalUsers}</div>
              <div className={styles.statLabel}>Total Users</div>
            </div>
          </div>

          <h2 className={styles.sectionHeading}>Links</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.permLinks}</div>
              <div className={styles.statLabel}>Permanent Links</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.tempLinks}</div>
              <div className={styles.statLabel}>Temporary Links</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{stats.totalLinks}</div>
              <div className={styles.statLabel}>Total Links</div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}

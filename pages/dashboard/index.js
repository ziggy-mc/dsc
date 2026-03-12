import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { getUserTier, countUserLinks, getUserLimits } from "../../lib/tiers";
import { TIERS } from "../../lib/tierConstants";
import Layout from "../../components/Layout";
import { HomeIcon, LinkIcon, ScissorsIcon, InfinityIcon } from "../../components/Icons";
import styles from "../../styles/Dashboard.module.css";

export async function getServerSideProps({ req, res }) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return { redirect: { destination: "/?error=unauthenticated", permanent: false } };
  }

  const { discordId, discordUsername, name, image } = session.user;
  const tier = await getUserTier(discordId);
  const counts = await countUserLinks(discordId);
  const limits = await getUserLimits(discordId, tier);

  return {
    props: {
      user: { discordId, discordUsername, name, image },
      tier,
      counts,
      limits,
    },
  };
}

export default function DashboardHome({ user, tier, counts, limits }) {
  const tierLabel = tier === TIERS.PAID ? "Supporter" : "Free";

  return (
    <Layout>
      <Head>
        <title>Dashboard – Discord Invite Shortener</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.layout}>
        {/* Sidebar */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <span className={styles.sidebarBrandText}>Dashboard</span>
          </div>
          <Link href="/dashboard" className={`${styles.navLink} ${styles.navLinkActive}`}>
            <HomeIcon /> Overview
          </Link>
          <Link href="/dashboard/links" className={styles.navLink}>
            <LinkIcon /> My Links
          </Link>
          <Link href="/" className={styles.navLink}>
            <ScissorsIcon /> Create Link
          </Link>
        </nav>

        {/* Main */}
        <main className={styles.main}>
          {/* Account overview card */}
          <div className={styles.accountCard}>
            {user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className={styles.avatar} />
            )}
            <div className={styles.accountInfo}>
              <h1 className={styles.userName}>{user.name}</h1>
              <p className={styles.tierLabel}>
                Account tier:{" "}
                <span className={styles.tierName}>{tierLabel}</span>
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Links</p>
              <p className={styles.statValue}>
                {counts.total}
                <span className={styles.statMax}> / {limits.total === Infinity ? <InfinityIcon width={16} height={16} style={{ verticalAlign: "middle" }} /> : limits.total}</span>
              </p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Temp Links</p>
              <p className={styles.statValue}>
                {counts.temp}
                <span className={styles.statMax}> / {limits.temp === Infinity ? <InfinityIcon width={16} height={16} style={{ verticalAlign: "middle" }} /> : limits.temp}</span>
              </p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Permanent Links</p>
              <p className={styles.statValue}>
                {counts.permanent}
                <span className={styles.statMax}> / {limits.permanent}</span>
              </p>
            </div>
          </div>

          <div className={styles.actions}>
            <Link href="/" className={styles.actionButton}>
              <ScissorsIcon /> Create a new short link
            </Link>
            <Link href="/dashboard/links" className={styles.actionButtonOutline}>
              <LinkIcon /> Manage my links
            </Link>
          </div>

          {tier === TIERS.FREE && (
            <div className={styles.upgradeNotice}>
              <p>
                <strong>Want more?</strong> Become a Supporter to unlock 10
                links, custom slugs, 180-day expiry, and more domains.
              </p>
            </div>
          )}
        </main>
      </div>
    </Layout>
  );
}

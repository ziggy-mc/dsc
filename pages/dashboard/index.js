import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { getUserTier, countUserLinks } from "../../lib/tiers";
import { LIMITS, TIERS } from "../../lib/tierConstants";
import styles from "../../styles/Dashboard.module.css";

export async function getServerSideProps({ req, res }) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return { redirect: { destination: "/?error=unauthenticated", permanent: false } };
  }

  const { discordId, discordUsername, name, image } = session.user;
  const tier = await getUserTier(discordId);
  const counts = await countUserLinks(discordId);
  const limits = LIMITS[tier];

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
  const tierLabel = tier === TIERS.PAID ? "⚡ Supporter" : "Free";
  const tierColor = tier === TIERS.PAID ? "#f59e0b" : "#5865f2";

  return (
    <>
      <Head>
        <title>Dashboard – Discord Invite Shortener</title>
        <meta name="robots" content="noindex" />
      </Head>

      <div className={styles.layout}>
        {/* Sidebar */}
        <nav className={styles.sidebar}>
          <div className={styles.sidebarBrand}>
            <span className={styles.sidebarBrandText}>DSC Shortener</span>
          </div>
          <Link href="/dashboard" className={styles.navLink}>
            🏠 Home
          </Link>
          <Link href="/dashboard/links" className={styles.navLink}>
            🔗 My Links
          </Link>
          <Link href="/" className={styles.navLink}>
            ✂️ Create Link
          </Link>
        </nav>

        {/* Main */}
        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <div className={styles.userInfo}>
              {user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className={styles.avatar} />
              )}
              <div>
                <h1 className={styles.userName}>{user.name}</h1>
                <span className={styles.tierBadge} style={{ background: tierColor }}>
                  {tierLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Links</p>
              <p className={styles.statValue}>
                {counts.total}
                <span className={styles.statMax}> / {limits.total === Infinity ? "∞" : limits.total}</span>
              </p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Temp Links</p>
              <p className={styles.statValue}>
                {counts.temp}
                <span className={styles.statMax}> / {limits.temp === Infinity ? "∞" : limits.temp}</span>
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
              ✂️ Create a new short link
            </Link>
            <Link href="/dashboard/links" className={styles.actionButtonOutline}>
              🔗 Manage my links
            </Link>
          </div>

          {tier === TIERS.FREE && (
            <div className={styles.upgradeNotice}>
              <p>
                <strong>Want more?</strong> Become a Supporter to unlock 10
                links, custom slugs, 6-month expiry, and more domains.
              </p>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "../styles/Layout.module.css";

export default function Navbar() {
  const { data: session, status } = useSession();

  return (
    <header className={styles.navbar}>
      <Link href="/" className={styles.navBrand}>
        <span>Discord Invite</span>
        <span className={styles.navBrandAccent}>Shortener</span>
      </Link>

      <nav className={styles.navRight}>
        {status !== "loading" && session && (
          <>
            <Link href="/dashboard" className={styles.navLink}>
              Dashboard
            </Link>
            <Link href="/dashboard/links" className={styles.navLink}>
              My Links
            </Link>
            <div className={styles.navDivider} />
            {session.user?.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className={styles.navAvatar}
              />
            )}
            <span className={styles.navUserName}>{session.user?.name}</span>
            <button
              onClick={() => signOut()}
              className={styles.navButton}
            >
              Sign out
            </button>
          </>
        )}
        {status !== "loading" && !session && (
          <button
            onClick={() => signIn("discord")}
            className={`${styles.navButton} ${styles.navButtonPrimary}`}
          >
            Login with Discord
          </button>
        )}
      </nav>
    </header>
  );
}

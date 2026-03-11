import Link from "next/link";
import styles from "../styles/Layout.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          Discord Invite{" "}
          <span className={styles.footerBrandAccent}>Shortener</span>
        </div>

        <nav className={styles.footerNav}>
          <Link href="/" className={styles.footerLink}>
            Home
          </Link>
          <Link href="/dashboard" className={styles.footerLink}>
            Dashboard
          </Link>
          <Link href="/dashboard/links" className={styles.footerLink}>
            My Links
          </Link>
          <Link href="/report" className={styles.footerLink}>
            Report Link
          </Link>
        </nav>

        <div className={styles.footerLegal}>
          <Link href="/terms" className={styles.footerLink}>
            Terms of Service
          </Link>
          <Link href="/privacy" className={styles.footerLink}>
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}

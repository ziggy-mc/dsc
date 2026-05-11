import Link from "next/link";
import styles from "../styles/Layout.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          DC Invs
          <br />
          <span>({" "}
          <Link href="/zigydbot" className="underline decoration-white/30 underline-offset-4 transition-colors duration-300 hover:text-white/85">
            zigydbot
          </Link>)</span>
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

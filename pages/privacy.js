import Head from "next/head";
import Layout from "../components/Layout";
import styles from "../styles/Legal.module.css";

export default function PrivacyPolicy() {
  return (
    <Layout>
      <Head>
        <title>Privacy Policy – Discord Invite Shortener</title>
        <meta name="description" content="Privacy Policy for Discord Invite Shortener" />
      </Head>

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated: March 2025</p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Introduction</h2>
            <p className={styles.text}>
              Discord Invite Shortener (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) is committed to protecting
              your privacy. This Privacy Policy explains what information we collect, how we use it,
              and your rights regarding that information.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Information We Collect</h2>
            <p className={styles.text}>
              We collect information you provide directly or that is automatically collected when
              you use the Service:
            </p>

            <h3 className={styles.subTitle}>Discord Authentication Data</h3>
            <p className={styles.text}>
              When you log in with Discord, we receive and store the following data from Discord&apos;s
              OAuth2 API:
            </p>
            <ul className={styles.list}>
              <li>Discord user ID</li>
              <li>Discord username and discriminator</li>
              <li>Display name and avatar URL</li>
              <li>Email address</li>
            </ul>
            <p className={styles.text}>
              This data is used solely to identify your account and determine your account tier.
            </p>

            <h3 className={styles.subTitle}>Shortened Links</h3>
            <p className={styles.text}>
              When you create a shortened link, we store:
            </p>
            <ul className={styles.list}>
              <li>The destination URL (Discord invite link)</li>
              <li>The short code or custom slug</li>
              <li>The creation timestamp and expiration date</li>
              <li>Your Discord user ID (to associate the link with your account)</li>
            </ul>

            <h3 className={styles.subTitle}>Request Logging</h3>
            <p className={styles.text}>
              Our hosting infrastructure may automatically log standard request metadata such as IP
              addresses, user agents, and request timestamps when short links are accessed. This
              information is used for operational and security purposes and is not used for
              individual user profiling.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. How We Use Your Data</h2>
            <p className={styles.text}>
              We use the information we collect to:
            </p>
            <ul className={styles.list}>
              <li>Operate and maintain the Service</li>
              <li>Associate shortened links with your account</li>
              <li>Enforce account tier limits and feature access</li>
              <li>Detect and prevent abuse of the Service</li>
              <li>Respond to support inquiries</li>
            </ul>
            <p className={styles.text}>
              We do not sell your personal data to third parties. We do not use your data for
              advertising purposes.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Data Retention</h2>
            <p className={styles.text}>
              Account information is retained for as long as your account remains active. Shortened
              links are retained until they expire or are manually deleted by you or by us in
              accordance with our Terms of Service. If you wish to have your account data removed,
              please contact us.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Third-Party Services</h2>

            <h3 className={styles.subTitle}>Discord OAuth</h3>
            <p className={styles.text}>
              Authentication is handled via Discord&apos;s OAuth2 service. When you log in, Discord
              shares limited profile information with us. Your use of Discord is subject to
              Discord&apos;s own{" "}
              <a
                href="https://discord.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Privacy Policy
              </a>
              .
            </p>

            <h3 className={styles.subTitle}>Patreon Verification</h3>
            <p className={styles.text}>
              Supporter tier status may be verified through Patreon. If Patreon integration is
              active, we may receive information confirming your active Patreon membership status.
              Your use of Patreon is subject to{" "}
              <a
                href="https://www.patreon.com/policy/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Patreon&apos;s Privacy Policy
              </a>
              .
            </p>

            <h3 className={styles.subTitle}>Hosting Infrastructure</h3>
            <p className={styles.text}>
              The Service is hosted on cloud infrastructure that may process your data in accordance
              with their own privacy practices.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Your Rights</h2>
            <p className={styles.text}>
              You have the right to:
            </p>
            <ul className={styles.list}>
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Delete your own shortened links at any time via the dashboard</li>
            </ul>
            <p className={styles.text}>
              To exercise these rights or if you have questions about this Privacy Policy, please
              contact us.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Changes to This Policy</h2>
            <p className={styles.text}>
              We may update this Privacy Policy from time to time. Changes will be reflected on this
              page with an updated date. Continued use of the Service after changes constitutes
              acceptance of the revised policy.
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}

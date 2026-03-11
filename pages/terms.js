import Head from "next/head";
import Layout from "../components/Layout";
import styles from "../styles/Legal.module.css";

export default function TermsOfService() {
  return (
    <Layout>
      <Head>
        <title>Terms of Service – Discord Invite Shortener</title>
        <meta name="description" content="Terms of Service for Discord Invite Shortener" />
      </Head>

      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.pageTitle}>Terms of Service</h1>
          <p className={styles.lastUpdated}>Last updated: March 2025</p>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
            <p className={styles.text}>
              By accessing or using Discord Invite Shortener (&quot;the Service&quot;), you agree to
              be bound by these Terms of Service. If you do not agree to these terms, please do not
              use the Service. We reserve the right to update these terms at any time, and continued
              use of the Service constitutes acceptance of any changes.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Description of Service</h2>
            <p className={styles.text}>
              Discord Invite Shortener is a link shortening service designed specifically for Discord
              invite links. The Service allows users to create short, shareable URLs that redirect to
              Discord server invite pages. Users may create short links as guests or by authenticating
              with their Discord account.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Proper Use of the Service</h2>
            <p className={styles.text}>
              You agree to use the Service only for lawful purposes and in a manner that does not
              infringe the rights of others. You must only shorten links that point to legitimate
              Discord server invite URLs. Shortened links may only be used to redirect users to valid
              Discord communities.
            </p>
            <p className={styles.text}>
              You are solely responsible for any links you create and the content that those links
              point to. We reserve the right to remove any link at our discretion.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Abuse Prevention</h2>
            <p className={styles.text}>
              We take abuse seriously. Automated abuse detection may be used to identify and remove
              links that violate these terms. Repeated violations may result in account suspension or
              a ban from the Service. If you believe a link has been incorrectly removed, you may
              contact us to appeal.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Prohibited Content</h2>
            <p className={styles.text}>
              You may not use the Service to shorten links that lead to:
            </p>
            <ul className={styles.list}>
              <li>Servers promoting harassment, hate speech, or discrimination</li>
              <li>Servers distributing malware, phishing content, or scam material</li>
              <li>Servers violating Discord&apos;s Terms of Service or Community Guidelines</li>
              <li>Illegal content of any kind</li>
              <li>Content targeting minors inappropriately</li>
            </ul>
            <p className={styles.text}>
              We reserve the right to determine what constitutes prohibited content at our sole
              discretion.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Link Removal Rights</h2>
            <p className={styles.text}>
              We reserve the right to remove any shortened link at any time, with or without notice,
              for any reason including but not limited to: violation of these terms, abuse reports,
              or at our discretion. We are not obligated to provide a reason for link removal.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Expiration Policies</h2>
            <p className={styles.text}>
              Shortened links are subject to expiration based on the tier of the account that
              created them. Guest links expire after 7 days. Free account links may be created with
              expiration periods up to 90 days. Supporter accounts may create links with longer
              expiration periods, including permanent links (subject to account limits).
            </p>
            <p className={styles.text}>
              We reserve the right to adjust expiration policies at any time. Expired links will
              return a 404 or redirect to an error page.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Account Suspension</h2>
            <p className={styles.text}>
              We reserve the right to suspend or terminate your account at any time if we determine
              you have violated these Terms of Service. Suspended accounts will lose access to link
              management and creation features. Links created by suspended accounts may be removed
              at our discretion.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Disclaimer of Liability</h2>
            <p className={styles.text}>
              The Service is provided &quot;as is&quot; without warranties of any kind, either express or
              implied. We do not guarantee the availability, accuracy, or reliability of the Service.
              We are not liable for any damages arising from your use of the Service or from links
              that were shortened using the Service.
            </p>
            <p className={styles.text}>
              We are not responsible for the content of external websites that shortened links point
              to, including Discord servers. Users access external content at their own risk.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>10. Changes to Terms</h2>
            <p className={styles.text}>
              We may modify these Terms of Service at any time. Changes will be posted on this page
              with an updated date. Your continued use of the Service after changes are posted
              constitutes your acceptance of the revised terms. We encourage you to review these
              terms periodically.
            </p>
          </section>
        </div>
      </main>
    </Layout>
  );
}

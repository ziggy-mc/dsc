import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { connectToDatabase } from "../../lib/mongodb";
import ReferralCode from "../../models/ReferralCode";
import Layout from "../../components/Layout";
import styles from "../../styles/Admin.module.css";

const ADMIN_DISCORD_ID = "794228666518339604";

const PERK_LABELS = {
  permLinks: "Extra Perm Links",
  tempLinks: "Extra Temp Links",
  noLoading: "No Loading Screen",
};

export async function getServerSideProps({ req, res }) {
  const session = await getServerSession(req, res, authOptions);

  if (
    !session?.user?.discordId ||
    session.user.discordId !== ADMIN_DISCORD_ID
  ) {
    return { redirect: { destination: "/", permanent: false } };
  }

  await connectToDatabase();
  const codes = await ReferralCode.find().sort({ createdAt: -1 }).lean();

  return {
    props: {
      initialCodes: codes.map((c) => ({
        ...c,
        _id: c._id.toString(),
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
        usedBy: c.usedBy || [],
      })),
    },
  };
}

export default function AdminReferPage({ initialCodes }) {
  const [codes, setCodes] = useState(initialCodes);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formPerkType, setFormPerkType] = useState("permLinks");
  const [formPerkValue, setFormPerkValue] = useState("1");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setCreating(true);

    try {
      const res = await fetch("/api/admin/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: formCode.trim() || undefined,
          perkType: formPerkType,
          perkValue: formPerkValue,
          maxUses: formMaxUses.trim() || undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create code.");
      } else {
        setCodes((prev) => [data.code, ...prev]);
        setSuccess(`Code "${data.code.code}" created successfully.`);
        setFormCode("");
        setFormPerkValue("1");
        setFormMaxUses("");
      }
    } catch {
      setError("Network error.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id, code) => {
    if (!confirm(`Delete code "${code}"?`)) return;
    setError("");
    setSuccess("");
    setLoadingId(id);

    try {
      const res = await fetch("/api/admin/refer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", codeId: id }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete code.");
      } else {
        setCodes((prev) => prev.filter((c) => c._id !== id));
        setSuccess(`Code "${code}" deleted.`);
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
        <title>Admin – Referral Codes – Discord Invite Shortener</title>
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
          <Link href="/admin/accounts" className={styles.navLink}>
            Accounts
          </Link>
          <Link
            href="/admin/refer"
            className={`${styles.navLink} ${styles.navLinkActive}`}
          >
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
          <Link href="/admin/accounts" className={styles.navLink}>
            Accounts
          </Link>
          <Link
            href="/admin/refer"
            className={`${styles.navLink} ${styles.navLinkActive}`}
          >
            Refer Codes
          </Link>
        </nav>

        <main className={styles.main}>
          <div className={styles.pageHeader}>
            <h1 className={styles.pageTitle}>Referral Codes</h1>
            <span className={styles.badge}>{codes.length} total</span>
          </div>

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className={styles.successBanner} role="status">
              {success}
            </div>
          )}

          {/* ── Create form ── */}
          <div className={styles.formCard}>
            <div className={styles.formTitle}>Create Referral Code</div>
            <form onSubmit={handleCreate}>
              <div className={styles.formRow}>
                <div className={styles.formField}>
                  <label className={styles.formLabel} htmlFor="ref-code">
                    Code (blank = auto-generate)
                  </label>
                  <input
                    id="ref-code"
                    type="text"
                    className={styles.formInput}
                    placeholder="Leave blank to auto-generate"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <div className={styles.formField}>
                  <label className={styles.formLabel} htmlFor="ref-perk-type">
                    Perk
                  </label>
                  <select
                    id="ref-perk-type"
                    className={styles.formSelect}
                    value={formPerkType}
                    onChange={(e) => setFormPerkType(e.target.value)}
                  >
                    <option value="permLinks">Extra Permanent Links</option>
                    <option value="tempLinks">Extra Temporary Links</option>
                    <option value="noLoading">No Loading Screen (1 link)</option>
                  </select>
                </div>

                {formPerkType !== "noLoading" && (
                  <div className={styles.formField} style={{ maxWidth: 100 }}>
                    <label className={styles.formLabel} htmlFor="ref-perk-value">
                      Amount
                    </label>
                    <input
                      id="ref-perk-value"
                      type="number"
                      min="1"
                      max="100"
                      className={styles.formInput}
                      value={formPerkValue}
                      onChange={(e) => setFormPerkValue(e.target.value)}
                    />
                  </div>
                )}

                <div className={styles.formField} style={{ maxWidth: 120 }}>
                  <label className={styles.formLabel} htmlFor="ref-max-uses">
                    Max Uses (blank = ∞)
                  </label>
                  <input
                    id="ref-max-uses"
                    type="number"
                    min="1"
                    className={styles.formInput}
                    placeholder="Unlimited"
                    value={formMaxUses}
                    onChange={(e) => setFormMaxUses(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.createButton}
                  disabled={creating}
                >
                  {creating ? "Creating…" : "Create Code"}
                </button>
              </div>
            </form>
          </div>

          {/* ── Codes table ── */}
          {codes.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No referral codes yet. Create one above.</p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Perk</th>
                    <th>Value</th>
                    <th>Uses</th>
                    <th>Max Uses</th>
                    <th>Created</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c._id}>
                      <td className={styles.monoCell}>{c.code}</td>
                      <td>
                        <span
                          className={`${styles.perkBadge} ${
                            c.perkType === "permLinks"
                              ? styles.perkPermLinks
                              : c.perkType === "tempLinks"
                              ? styles.perkTempLinks
                              : styles.perkNoLoading
                          }`}
                        >
                          {PERK_LABELS[c.perkType] || c.perkType}
                        </span>
                      </td>
                      <td>{c.perkType === "noLoading" ? "—" : `+${c.perkValue}`}</td>
                      <td>{c.uses}</td>
                      <td>{c.maxUses === null ? "∞" : c.maxUses}</td>
                      <td className={styles.dateCell}>
                        {c.createdAt
                          ? new Date(c.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(c._id, c.code)}
                          disabled={loadingId === c._id}
                          className={styles.removeButton}
                        >
                          {loadingId === c._id ? "…" : "Delete"}
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

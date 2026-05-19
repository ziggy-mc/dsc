import { useState, useEffect } from "react";
import Head from "next/head";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./api/auth/[...nextauth]";
import Layout from "../components/Layout";
import styles from "../styles/Report.module.css";

const ALLOWED_DOMAINS = ["dscs.ziggymc.me", "invs.ziggymc.me", "ds.ziggymc.me", "d.ziggymc.me"];

export async function getServerSideProps({ req, res }) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return { redirect: { destination: "/?error=unauthenticated", permanent: false } };
  }

  return {
    props: {
      user: {
        discordId: session.user.discordId,
        discordUsername: session.user.discordUsername || session.user.name || "",
      },
    },
  };
}

export default function ReportPage({ user }) {
  const [reportedLink, setReportedLink] = useState("");
  const [reason, setReason] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Revoke the object URL when it changes or when the component unmounts
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate link domain
    let parsedUrl;
    try {
      parsedUrl = new URL(reportedLink.trim());
    } catch {
      setError("Please enter a valid URL.");
      return;
    }

    const hostname = parsedUrl.hostname;
    if (!ALLOWED_DOMAINS.includes(hostname)) {
      setError(
        `You can only report links from this service. Allowed domains: ${ALLOWED_DOMAINS.join(", ")}`
      );
      return;
    }

    // Extract short code (first path segment after /)
    const shortCode = parsedUrl.pathname.replace(/^\//, "").split("/")[0];
    if (!shortCode) {
      setError("Could not extract a short code from the provided URL.");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason for the report.");
      return;
    }

    if (imageFile) {
      const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
      if (imageFile.size > MAX_IMAGE_BYTES) {
        setError("Image must be 4 MB or smaller.");
        return;
      }
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("reportedLink", reportedLink.trim());
      formData.append("shortCode", shortCode);
      formData.append("reason", reason.trim());
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch("/api/report", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit report. Please try again.");
      } else {
        setSuccess("Your report has been submitted. Thank you.");
        setReportedLink("");
        setReason("");
        setImageFile(null);
        setImagePreview(null);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <Head>
        <title>Report a Link – Discord Invite Shortener</title>
        <meta name="robots" content="noindex" />
      </Head>

      <main className={styles.main}>
        <div className={styles.card}>
          <h1 className={styles.title}>Report a Link</h1>
          <p className={styles.subtitle}>
            Use this form to report a short link that violates our terms of service.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            {/* Reporter info (read-only) */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Discord Username</label>
              <input
                type="text"
                value={user.discordUsername}
                readOnly
                className={`${styles.input} ${styles.inputReadOnly}`}
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Discord User ID</label>
              <input
                type="text"
                value={user.discordId}
                readOnly
                className={`${styles.input} ${styles.inputReadOnly}`}
              />
            </div>

            {/* Short URL being reported */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="reported-link">
                Short URL being reported
              </label>
              <input
                id="reported-link"
                type="url"
                value={reportedLink}
                onChange={(e) => {
                  setReportedLink(e.target.value);
                  setError("");
                }}
                placeholder={`https://ds.ziggymc.me/abc123`}
                className={styles.input}
                required
              />
              <p className={styles.fieldHelper}>
                Only links from {ALLOWED_DOMAINS.join(" or ")} can be reported.
              </p>
            </div>

            {/* Reason */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="reason">
                Reason for report
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe why you are reporting this link..."
                className={styles.textarea}
                rows={4}
                required
              />
            </div>

            {/* Optional image */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="image-upload">
                Supporting image (optional, max 4 MB)
              </label>
              <input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setImageFile(file);
                  setImagePreview(file ? URL.createObjectURL(file) : null);
                }}
                className={styles.fileInput}
              />
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className={styles.imagePreview}
                />
              )}
            </div>

            {error && (
              <div className={styles.error} role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className={styles.successMessage} role="status">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={styles.submitButton}
            >
              {loading ? "Submitting…" : "Submit Report"}
            </button>
          </form>
        </div>
      </main>
    </Layout>
  );
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import DSReport from "../../../models/DSReport";
import { put } from "@vercel/blob";
import { formidable } from "formidable";
import fs from "fs/promises";

const ALLOWED_DOMAINS = ["dscs.ziggymc.me", "invs.ziggymc.me", "ds.ziggymc.me", "d.ziggymc.me"];

export const config = {
  api: {
    bodyParser: false,
  },
};

function parseForm(req) {
  return new Promise((resolve, reject) => {
    const form = formidable({ maxFileSize: 4 * 1024 * 1024 });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  let fields, files;
  try {
    ({ fields, files } = await parseForm(req));
  } catch {
    return res.status(400).json({ error: "Failed to parse form data." });
  }

  const reportedLink = Array.isArray(fields.reportedLink)
    ? fields.reportedLink[0]
    : fields.reportedLink;
  const shortCode = Array.isArray(fields.shortCode)
    ? fields.shortCode[0]
    : fields.shortCode;
  const reason = Array.isArray(fields.reason)
    ? fields.reason[0]
    : fields.reason;

  if (!reportedLink || !shortCode || !reason) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // Validate domain
  let parsedUrl;
  try {
    parsedUrl = new URL(reportedLink);
  } catch {
    return res.status(400).json({ error: "Invalid URL." });
  }

  if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
    return res.status(400).json({
      error: `Only links from ${ALLOWED_DOMAINS.join(" or ")} can be reported.`,
    });
  }

  let imageUrl = null;
  const imageFile = files.image?.[0];

  if (imageFile) {
    try {
      const buffer = await fs.readFile(imageFile.filepath);
      const safeName = (imageFile.originalFilename || "image")
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .slice(0, 128);
      const filename = `reports/${Date.now()}-${safeName}`;
      const blob = await put(filename, buffer, { access: "public" });
      imageUrl = blob.url;
    } catch (err) {
      console.error("Failed to upload image to Vercel Blob:", err);
      return res.status(500).json({ error: "Failed to upload image." });
    } finally {
      try {
        await fs.unlink(imageFile.filepath);
      } catch {
        // ignore cleanup errors
      }
    }
  }

  try {
    await connectToDatabase();

    await DSReport.create({
      reporterDiscordId: session.user.discordId,
      reporterUsername:
        session.user.discordUsername || session.user.name || "Unknown",
      reportedLink,
      shortCode,
      reason,
      imageUrl,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to save report:", err);
    return res.status(500).json({ error: "Failed to save report." });
  }
}


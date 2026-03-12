import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import DSReport from "../../../models/DSReport";

const ALLOWED_DOMAINS = ["dscs.ziggymc.me", "invs.ziggymc.me", "ds.ziggymc.me", "d.ziggymc.me"];

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { reportedLink, shortCode, reason, imageUrl } = req.body;

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

  try {
    await connectToDatabase();

    await DSReport.create({
      reporterDiscordId: session.user.discordId,
      reporterUsername:
        session.user.discordUsername || session.user.name || "Unknown",
      reportedLink,
      shortCode,
      reason,
      imageUrl: imageUrl || null,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to save report:", err);
    return res.status(500).json({ error: "Failed to save report." });
  }
}

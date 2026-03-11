import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import DSReport from "../../../models/DSReport";
import ShortLink from "../../../models/ShortLink";

const ADMIN_DISCORD_ID = "794228666518339604";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await connectToDatabase();

  if (req.method === "GET") {
    const reports = await DSReport.find().sort({ createdAt: -1 }).lean();
    return res.status(200).json({ reports });
  }

  if (req.method === "POST") {
    const { action, reportId } = req.body;

    if (!reportId) {
      return res.status(400).json({ error: "Missing reportId." });
    }

    if (action === "dismiss") {
      await DSReport.findByIdAndDelete(reportId);
      return res.status(200).json({ success: true });
    }

    if (action === "removeLink") {
      const report = await DSReport.findById(reportId);
      if (!report) {
        return res.status(404).json({ error: "Report not found." });
      }
      // Delete the short link
      await ShortLink.findOneAndDelete({ code: report.shortCode });
      // Delete the report
      await DSReport.findByIdAndDelete(reportId);
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Invalid action." });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

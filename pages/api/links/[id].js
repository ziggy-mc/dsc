import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import ShortLink from "../../../models/ShortLink";

/**
 * DELETE /api/links/[id] – delete a link owned by the authenticated user
 */
export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(401).json({ error: "You must be logged in to delete links." });
  }

  const { id } = req.query;

  try {
    await connectToDatabase();
    const link = await ShortLink.findById(id).lean();

    if (!link) {
      return res.status(404).json({ error: "Link not found." });
    }

    if (link.ownerDiscordId !== session.user.discordId) {
      return res.status(403).json({ error: "You do not own this link." });
    }

    await ShortLink.findByIdAndDelete(id);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to delete link:", err);
    return res.status(500).json({ error: "Failed to delete link." });
  }
}

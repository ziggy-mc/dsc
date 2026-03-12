import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import ShortLink from "../../../models/ShortLink";

const ADMIN_DISCORD_ID = "794228666518339604";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await connectToDatabase();

  if (req.method === "GET") {
    const { discordId } = req.query;
    const filter = discordId ? { ownerDiscordId: discordId } : {};
    const links = await ShortLink.find(filter).sort({ createdAt: -1 }).lean();
    return res.status(200).json({
      links: links.map((l) => ({
        ...l,
        _id: l._id.toString(),
        createdAt: l.createdAt ? new Date(l.createdAt).toISOString() : null,
        expiresAt: l.expiresAt ? new Date(l.expiresAt).toISOString() : null,
      })),
    });
  }

  if (req.method === "POST") {
    const { action, linkId } = req.body;

    if (action === "delete") {
      if (!linkId) return res.status(400).json({ error: "Missing linkId." });
      const deleted = await ShortLink.findByIdAndDelete(linkId);
      if (!deleted) return res.status(404).json({ error: "Link not found." });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Invalid action." });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

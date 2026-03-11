import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import ShortLink from "../../../models/ShortLink";

/**
 * GET /api/links – list all active links for the authenticated user
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(401).json({ error: "You must be logged in to view your links." });
  }

  try {
    await connectToDatabase();
    const links = await ShortLink.find({
      ownerDiscordId: session.user.discordId,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Annotate each link with whether it has expired
    const now = new Date();
    const annotated = links.map((l) => ({
      ...l,
      _id: l._id.toString(),
      expired: !l.isPermanent && l.expiresAt && new Date(l.expiresAt) <= now,
    }));

    return res.status(200).json({ links: annotated });
  } catch (err) {
    console.error("Failed to list links:", err);
    return res.status(500).json({ error: "Failed to fetch links." });
  }
}

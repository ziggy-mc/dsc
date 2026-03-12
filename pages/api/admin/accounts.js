import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";
import ShortLink from "../../../models/ShortLink";

const ADMIN_DISCORD_ID = "794228666518339604";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await connectToDatabase();

  if (req.method === "GET") {
    const users = await User.find()
      .select("discordId discordUsername createdAt suspended")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ users });
  }

  if (req.method === "POST") {
    const { action, discordId } = req.body;

    if (!discordId) {
      return res.status(400).json({ error: "Missing discordId." });
    }

    if (action === "suspend") {
      const updated = await User.findOneAndUpdate(
        { discordId },
        { $set: { suspended: true } }
      );
      if (!updated) {
        return res.status(404).json({ error: "User not found." });
      }
      return res.status(200).json({ success: true });
    }

    if (action === "unsuspend") {
      const updated = await User.findOneAndUpdate(
        { discordId },
        { $set: { suspended: false } }
      );
      if (!updated) {
        return res.status(404).json({ error: "User not found." });
      }
      return res.status(200).json({ success: true });
    }

    if (action === "deleteAccount") {
      const user = await User.findOne({ discordId });
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      // Delete all links belonging to this user
      await ShortLink.deleteMany({ ownerDiscordId: discordId });
      // Disable the shortener (keeps the account schema so they can re-register)
      await User.findOneAndUpdate(
        { discordId },
        { $set: { "shortener.enabled": false } }
      );
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: "Invalid action." });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getUserTier, countUserLinks, getUserLimits } from "../../lib/tiers";
import { connectToDatabase } from "../../lib/mongodb";
import User from "../../models/User";

/**
 * GET /api/me – return current session and tier information
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(200).json({ loggedIn: false, tier: "guest" });
  }

  const { discordId, discordUsername, name, image } = session.user;
  const tier = await getUserTier(discordId);
  const counts = await countUserLinks(discordId);
  const limits = await getUserLimits(discordId, tier);
  await connectToDatabase();
  const account = await User.findOne({ discordId })
    .select("email emailVerified twoFactorEnabled")
    .lean();

  return res.status(200).json({
    loggedIn: true,
    tier,
    discordId,
    discordUsername,
    name,
    image,
    counts,
    limits,
    account: {
      email: account?.email || null,
      emailVerified: !!account?.emailVerified,
      twoFactorEnabled: !!account?.twoFactorEnabled,
      emailChangePolicy:
        "To change your email, please contact support.",
    },
  });
}

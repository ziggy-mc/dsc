import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { getUserTier, countUserLinks, getUserLimits } from "../../lib/tiers";

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

  return res.status(200).json({
    loggedIn: true,
    tier,
    discordId,
    discordUsername,
    name,
    image,
    counts,
    limits,
  });
}

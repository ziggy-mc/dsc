import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import { connectToDatabase } from "../../lib/mongodb";
import ReferralCode from "../../models/ReferralCode";
import User from "../../models/User";
import ShortLink from "../../models/ShortLink";

/**
 * POST /api/redeem
 *
 * Body (step 1 – validate + apply or request link selection):
 *   { code: string }
 *
 * Body (step 2 – apply noLoading perk to a specific link):
 *   { code: string, selectedLinkCode: string }
 *
 * Responses:
 *   200 { success: true, perkType, perkValue }          – perk applied
 *   200 { needsLinkSelect: true, links: [...] }          – noLoading needs selection
 *   400 { error: string }
 *   401 { error: string }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(401).json({ error: "You must be logged in to redeem a referral code." });
  }

  const { discordId } = session.user;
  const { code, selectedLinkCode } = req.body || {};

  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Referral code is required." });
  }

  await connectToDatabase();

  const referral = await ReferralCode.findOne({
    code: code.trim().toLowerCase(),
  }).lean();

  if (!referral) {
    return res.status(400).json({ error: "Invalid referral code." });
  }

  // Check if user already used this code
  if (referral.usedBy.includes(discordId)) {
    return res.status(400).json({ error: "You have already redeemed this code." });
  }

  // Check max uses
  if (referral.maxUses !== null && referral.uses >= referral.maxUses) {
    return res.status(400).json({ error: "This referral code has reached its usage limit." });
  }

  // ── noLoading perk: needs link selection first ──────────────────────────
  if (referral.perkType === "noLoading") {
    if (!selectedLinkCode) {
      // Return the user's active links so they can pick one
      const now = new Date();
      const links = await ShortLink.find({
        ownerDiscordId: discordId,
        loading: true,
      })
        .select("code targetUrl expiresAt isPermanent domain")
        .lean();

      const activeLinks = links
        .filter((l) => l.isPermanent || !l.expiresAt || l.expiresAt > now)
        .map((l) => ({
          code: l.code,
          targetUrl: l.targetUrl,
          shortUrl: `${l.domain}/${l.code}`,
          isPermanent: l.isPermanent,
          expiresAt: l.expiresAt ? l.expiresAt.toISOString() : null,
        }));

      return res.status(200).json({ needsLinkSelect: true, links: activeLinks });
    }

    // Apply the noLoading perk to the chosen link
    const link = await ShortLink.findOne({
      code: selectedLinkCode.trim(),
      ownerDiscordId: discordId,
    });

    if (!link) {
      return res.status(400).json({ error: "Selected link not found or not owned by you." });
    }

    link.loading = false;
    await link.save();
  } else if (referral.perkType === "permLinks") {
    await User.updateOne(
      { discordId },
      { $inc: { "referralPerks.extraPermLinks": referral.perkValue } }
    );
  } else if (referral.perkType === "tempLinks") {
    await User.updateOne(
      { discordId },
      { $inc: { "referralPerks.extraTempLinks": referral.perkValue } }
    );
  }

  // Mark code as used
  await ReferralCode.updateOne(
    { _id: referral._id },
    {
      $inc: { uses: 1 },
      $push: { usedBy: discordId },
    }
  );

  return res.status(200).json({
    success: true,
    perkType: referral.perkType,
    perkValue: referral.perkValue,
  });
}

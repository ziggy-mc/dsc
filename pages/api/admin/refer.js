import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import ReferralCode from "../../../models/ReferralCode";

const ADMIN_DISCORD_ID = "794228666518339604";

/** Generate a random short alphanumeric code (6 chars) */
function generateReferralCode() {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * GET  /api/admin/refer – list all referral codes
 * POST /api/admin/refer – create a new referral code
 *   Body: { code?, perkType, perkValue?, maxUses? }
 */
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId || session.user.discordId !== ADMIN_DISCORD_ID) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await connectToDatabase();

  // ── GET: list codes ────────────────────────────────────────────────────
  if (req.method === "GET") {
    const codes = await ReferralCode.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      codes: codes.map((c) => ({
        ...c,
        _id: c._id.toString(),
        createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : null,
      })),
    });
  }

  // ── POST: create code ─────────────────────────────────────────────────
  if (req.method === "POST") {
    const { action } = req.body || {};

    if (action === "delete") {
      const { codeId } = req.body;
      if (!codeId) return res.status(400).json({ error: "codeId is required." });
      await ReferralCode.findByIdAndDelete(codeId);
      return res.status(200).json({ success: true });
    }

    // Create
    const { code: rawCode, perkType, perkValue, maxUses } = req.body || {};

    if (!perkType || !["permLinks", "tempLinks", "noLoading"].includes(perkType)) {
      return res.status(400).json({ error: "Invalid perkType." });
    }

    const value = perkType === "noLoading" ? 1 : Math.max(1, parseInt(perkValue, 10) || 1);
    const uses = maxUses !== undefined && maxUses !== "" ? parseInt(maxUses, 10) || null : null;

    // Resolve code
    let code;
    if (rawCode && rawCode.trim()) {
      code = rawCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!code || code.length < 2 || code.length > 32) {
        return res.status(400).json({
          error: "Custom code must be 2–32 characters (letters, numbers, hyphens, underscores).",
        });
      }
      const exists = await ReferralCode.exists({ code });
      if (exists) {
        return res.status(409).json({ error: "That code already exists. Choose another." });
      }
    } else {
      // Auto-generate unique code
      let attempts = 0;
      do {
        code = generateReferralCode();
        attempts++;
        if (attempts > 20) {
          return res.status(500).json({ error: "Failed to generate a unique code. Try again." });
        }
      } while (await ReferralCode.exists({ code }));
    }

    const created = await ReferralCode.create({
      code,
      perkType,
      perkValue: value,
      maxUses: uses,
    });

    return res.status(201).json({
      success: true,
      code: {
        ...created.toObject(),
        _id: created._id.toString(),
        createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : null,
      },
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

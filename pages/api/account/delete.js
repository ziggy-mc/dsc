import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]";
import { connectToDatabase } from "../../../lib/mongodb";
import User from "../../../models/User";
import ShortLink from "../../../models/ShortLink";
import VerificationCode from "../../../models/VerificationCode";
import { verifyAndConsumeCode } from "../../../lib/authCodeService";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ discordId: session.user.discordId });
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    if (user.twoFactorEnabled) {
      const code = String(req.body?.code || "").trim();
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "A valid 2FA code is required." });
      }

      const verified = await verifyAndConsumeCode({
        email: user.email,
        type: "2fa",
        code,
      });

      if (!verified.ok) {
        if (verified.reason === "locked") {
          const waitSeconds = Math.max(1, Math.ceil((verified.lockedMs || 0) / 1000));
          return res.status(429).json({ error: "Too many failed attempts.", waitSeconds });
        }
        if (verified.reason === "expired") {
          return res.status(400).json({ error: "Code expired. Request a new code." });
        }
        return res.status(400).json({ error: "Invalid 2FA code." });
      }
    }

    const userId = user._id;
    const email = user.email;
    const discordId = user.discordId;

    await Promise.all([
      ShortLink.deleteMany({ ownerDiscordId: discordId }),
      VerificationCode.deleteMany({
        $or: [{ userId }, ...(email ? [{ email }] : [])],
      }),
      User.deleteOne({ _id: userId }),
    ]);

    return res.status(200).json({ success: true, revokeAllSessions: true });
  } catch (err) {
    console.error("Delete account failed:", err);
    return res.status(500).json({ error: "Failed to delete account." });
  }
}

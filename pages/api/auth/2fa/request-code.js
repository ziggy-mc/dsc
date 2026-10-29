import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]";
import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { checkRateLimit } from "../../../../lib/authRateLimit";
import { createCodeIfAllowed } from "../../../../lib/authCodeService";
import { sendVerificationEmail } from "../../../../lib/emailService";

function getClientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length > 0) {
    return header.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function subjectForPurpose(purpose) {
  if (purpose === "enable") return "Enable 2FA";
  if (purpose === "disable") return "Disable 2FA";
  return "2FA Code";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const ip = getClientIp(req);
  const rl = checkRateLimit({
    key: `${ip}:${session.user.discordId}`,
    scope: "auth:2fa:request",
    max: Number(process.env.AUTH_REQUEST_RATE_LIMIT_MAX || 5),
    windowMs: Number(process.env.AUTH_REQUEST_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  });

  if (!rl.allowed) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ discordId: session.user.discordId });
    if (!user?.email) {
      return res.status(400).json({ error: "No email is linked to this account." });
    }

    const created = await createCodeIfAllowed({
      userId: user._id,
      email: user.email,
      type: "2fa",
    });

    if (!created.created) {
      return res.status(409).json({
        error: "A code has already been sent. Please wait until it expires.",
        waitSeconds: Math.ceil(created.remainingMs / 1000),
      });
    }

    const purpose = String(req.body?.purpose || "login").toLowerCase();

    await sendVerificationEmail({
      to: user.email,
      subject: subjectForPurpose(purpose),
      name: user.username || user.discordUsername,
      code: created.code,
      website: process.env.NEXTAUTH_URL,
      type: "2fa",
      avatarUrl: user.avatarUrl,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("2FA request-code failed:", err);
    return res.status(500).json({ error: "Failed to send verification code." });
  }
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]";
import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { checkRateLimit } from "../../../../lib/authRateLimit";
import { normalizeEmail, verifyAndConsumeCode } from "../../../../lib/authCodeService";

function getClientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length > 0) {
    return header.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.discordId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const code = String(req.body?.code || "").trim();
  const providedEmail = normalizeEmail(req.body?.email);
  const ip = getClientIp(req);

  const rl = checkRateLimit({
    key: `${ip}:${session.user.discordId}`,
    scope: "auth:signup:verify",
    max: Number(process.env.AUTH_VERIFY_RATE_LIMIT_MAX || 10),
    windowMs: Number(process.env.AUTH_VERIFY_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  });

  if (!rl.allowed) {
    return res.status(429).json({ error: "Too many attempts. Please try again later." });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid code." });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ discordId: session.user.discordId });
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    const email = providedEmail || normalizeEmail(user.email);
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const verified = await verifyAndConsumeCode({
      email,
      type: "signup",
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

      return res.status(400).json({ error: "Invalid code." });
    }

    user.email = email;
    user.emailVerified = true;
    await user.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Signup verify-code failed:", err);
    return res.status(500).json({ error: "Verification failed." });
  }
}

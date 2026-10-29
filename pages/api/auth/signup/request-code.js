import { getServerSession } from "next-auth/next";
import { authOptions } from "../[...nextauth]";
import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { checkRateLimit } from "../../../../lib/authRateLimit";
import { createCodeIfAllowed, normalizeEmail } from "../../../../lib/authCodeService";
import { sendVerificationEmail } from "../../../../lib/emailService";

function getClientIp(req) {
  const header = req.headers["x-forwarded-for"];
  if (typeof header === "string" && header.length > 0) {
    return header.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || "unknown";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    scope: "auth:signup:request",
    max: Number(process.env.AUTH_REQUEST_RATE_LIMIT_MAX || 5),
    windowMs: Number(process.env.AUTH_REQUEST_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  });

  if (!rl.allowed) {
    return res.status(429).json({ error: "Too many requests. Try again later." });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({ discordId: session.user.discordId });
    if (!user) {
      return res.status(404).json({ error: "Account not found." });
    }

    const email = normalizeEmail(req.body?.email || user.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "A valid email is required." });
    }

    const created = await createCodeIfAllowed({
      userId: user._id,
      email,
      type: "signup",
    });

    if (!created.created) {
      return res.status(409).json({
        error: "A code has already been sent. Please wait until it expires.",
        waitSeconds: Math.ceil(created.remainingMs / 1000),
      });
    }

    await sendVerificationEmail({
      to: email,
      subject: "Verify Email",
      name: user.username || user.discordUsername,
      code: created.code,
      website: process.env.NEXTAUTH_URL,
      type: "email",
      avatarUrl: user.avatarUrl,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Signup request-code failed:", err);
    return res.status(500).json({ error: "Failed to send verification code." });
  }
}

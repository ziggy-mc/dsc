import { connectToDatabase } from "../../../../lib/mongodb";
import User from "../../../../models/User";
import { checkRateLimit } from "../../../../lib/authRateLimit";
import { createCodeIfAllowed, normalizeEmail } from "../../../../lib/authCodeService";
import { sendVerificationEmail } from "../../../../lib/emailService";

const GENERIC_MESSAGE = "If an account exists, a login code has been sent.";

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

  const email = normalizeEmail(req.body?.email);
  const ip = getClientIp(req);

  const rl = checkRateLimit({
    key: `${ip}:${email}`,
    scope: "auth:sso:request",
    max: Number(process.env.AUTH_REQUEST_RATE_LIMIT_MAX || 5),
    windowMs: Number(process.env.AUTH_REQUEST_RATE_LIMIT_WINDOW_MS || 10 * 60 * 1000),
  });

  if (!rl.allowed) {
    return res.status(429).json({ message: GENERIC_MESSAGE });
  }

  if (!isValidEmail(email)) {
    return res.status(200).json({ message: GENERIC_MESSAGE });
  }

  try {
    await connectToDatabase();

    const user = await User.findOne({
      email,
      emailVerified: true,
      suspended: { $ne: true },
    });

    if (!user) {
      return res.status(200).json({ message: GENERIC_MESSAGE });
    }

    const created = await createCodeIfAllowed({
      userId: user._id,
      email,
      type: "1pass",
    });

    if (created.created) {
      await sendVerificationEmail({
        to: email,
        subject: "Login Code",
        name: user.username || user.discordUsername,
        code: created.code,
        website: process.env.NEXTAUTH_URL,
        type: "1pass",
        avatarUrl: user.avatarUrl,
      });
    }

    return res.status(200).json({ message: GENERIC_MESSAGE });
  } catch (err) {
    console.error("SSO request-code failed:", err);
    return res.status(200).json({ message: GENERIC_MESSAGE });
  }
}

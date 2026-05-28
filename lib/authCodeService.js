import crypto from "crypto";
import VerificationCode from "../models/VerificationCode.js";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MINUTES = Number(process.env.AUTH_CODE_COOLDOWN_MINUTES || 10);

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export function generateSixDigitCode() {
  return crypto.randomInt(0, 1000000).toString().padStart(6, "0");
}

export async function getActiveCode({ email, type }) {
  const normalizedEmail = normalizeEmail(email);
  return VerificationCode.findOne({
    email: normalizedEmail,
    type,
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function createCodeIfAllowed({ email, type, userId = null }) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const existing = await getActiveCode({ email: normalizedEmail, type });
  if (existing) {
    const remainingMs = existing.expiresAt.getTime() - now.getTime();
    return {
      created: false,
      remainingMs: Math.max(0, remainingMs),
    };
  }

  const code = generateSixDigitCode();
  const expiresAt = new Date(now.getTime() + CODE_TTL_MINUTES * 60 * 1000);

  await VerificationCode.create({
    userId,
    email: normalizedEmail,
    type,
    codeHash: hashCode(code),
    expiresAt,
    attempts: 0,
    lockedUntil: null,
  });

  return {
    created: true,
    code,
    expiresAt,
  };
}

export async function verifyAndConsumeCode({ email, type, code }) {
  const normalizedEmail = normalizeEmail(email);
  const now = new Date();

  const record = await VerificationCode.findOne({
    email: normalizedEmail,
    type,
  }).sort({ createdAt: -1 });

  if (!record) {
    return { ok: false, reason: "invalid" };
  }

  if (record.expiresAt <= now) {
    await VerificationCode.deleteOne({ _id: record._id });
    return { ok: false, reason: "expired" };
  }

  if (record.lockedUntil && record.lockedUntil > now) {
    return {
      ok: false,
      reason: "locked",
      lockedMs: record.lockedUntil.getTime() - now.getTime(),
    };
  }

  const incomingHash = hashCode(code);
  const matches = crypto.timingSafeEqual(
    Buffer.from(incomingHash),
    Buffer.from(record.codeHash)
  );

  if (!matches) {
    record.attempts += 1;

    if (record.attempts >= MAX_ATTEMPTS) {
      record.lockedUntil = new Date(now.getTime() + COOLDOWN_MINUTES * 60 * 1000);
      record.attempts = 0;
    }

    await record.save();
    return {
      ok: false,
      reason: record.lockedUntil ? "locked" : "invalid",
      attemptsRemaining: record.lockedUntil ? 0 : Math.max(0, MAX_ATTEMPTS - record.attempts),
      lockedMs: record.lockedUntil ? record.lockedUntil.getTime() - now.getTime() : 0,
    };
  }

  await VerificationCode.deleteOne({ _id: record._id });
  return { ok: true, userId: record.userId };
}

export async function clearCodesForEmail(email) {
  const normalizedEmail = normalizeEmail(email);
  await VerificationCode.deleteMany({ email: normalizedEmail });
}

export async function clearCodesForUser(userId) {
  await VerificationCode.deleteMany({ userId });
}

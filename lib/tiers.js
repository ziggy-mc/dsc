/**
 * Server-side tier helpers for the shortener feature.
 * Import constants from lib/tierConstants.js (client-safe).
 */

import { connectToDatabase } from "./mongodb";
import Supporter from "../models/Supporter";
import ShortLink from "../models/ShortLink";
export {
  TIERS,
  ALLOWED_DOMAINS,
  EXPIRY_OPTIONS,
  LIMITS,
  MAX_TEMP_DAYS,
} from "./tierConstants";

import { TIERS } from "./tierConstants";

/**
 * Determine a user's tier from their discordId.
 * @param {string|null} discordId
 * @returns {Promise<'guest'|'free'|'paid'>}
 */
export async function getUserTier(discordId) {
  if (!discordId) return TIERS.GUEST;

  await connectToDatabase();
  const isSupporter = await Supporter.exists({ userId: discordId });
  return isSupporter ? TIERS.PAID : TIERS.FREE;
}

/**
 * Count current active (non-expired) links for a user.
 * @param {string} discordId
 * @returns {Promise<{total: number, temp: number, permanent: number}>}
 */
export async function countUserLinks(discordId) {
  await connectToDatabase();
  const now = new Date();

  const links = await ShortLink.find({ ownerDiscordId: discordId }).lean();
  // Filter out expired ones
  const active = links.filter(
    (l) => l.isPermanent || !l.expiresAt || l.expiresAt > now
  );

  const permanent = active.filter((l) => l.isPermanent).length;
  const temp = active.filter((l) => !l.isPermanent).length;
  return { total: active.length, temp, permanent };
}

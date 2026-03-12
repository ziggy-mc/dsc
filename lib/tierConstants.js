/**
 * Shared constants for user tiers – safe to import in both client and server code.
 * Does NOT import mongoose or any server-only modules.
 */

export const TIERS = {
  GUEST: "guest",
  FREE: "free",
  PAID: "paid",
};

/** Domains available for each tier */
export const ALLOWED_DOMAINS = {
  [TIERS.GUEST]: ["https://dscs.ziggymc.me"],
  [TIERS.FREE]: ["https://dscs.ziggymc.me", "https://invs.ziggymc.me"],
  [TIERS.PAID]: ["https://ds.ziggymc.me", "https://d.ziggymc.me"],
};

/** Expiration options (in days) available per tier; null = permanent */
export const EXPIRY_OPTIONS = {
  [TIERS.GUEST]: [7],
  [TIERS.FREE]: [7, 30, 90],
  [TIERS.PAID]: [7, 30, 90, 180, null],
};

/** Link limits per tier */
export const LIMITS = {
  [TIERS.GUEST]: { total: Infinity, temp: Infinity, permanent: 0 },
  [TIERS.FREE]: { total: 3, temp: 2, permanent: 1 },
  [TIERS.PAID]: { total: 10, temp: 7, permanent: 3 },
};

/** Maximum days a temporary link can last per tier */
export const MAX_TEMP_DAYS = {
  [TIERS.GUEST]: 7,
  [TIERS.FREE]: 90,
  [TIERS.PAID]: 180,
};

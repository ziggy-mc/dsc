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
const FREE_DOMAINS = ["https://dscs.ziggymc.me", "https://invs.ziggymc.me"];
const PAID_DOMAINS = ["https://ds.ziggymc.me", "https://d.ziggymc.me"];

export const ALLOWED_DOMAINS = {
  [TIERS.GUEST]: [FREE_DOMAINS[0]],
  [TIERS.FREE]: FREE_DOMAINS,
  [TIERS.PAID]: [...PAID_DOMAINS, ...FREE_DOMAINS],
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

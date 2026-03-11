/**
 * Store for shortened Discord invite links.
 *
 * Uses Vercel KV (Redis) when the KV_REST_API_URL environment variable is set,
 * otherwise falls back to an in-memory Map for local development.
 *
 * Vercel KV setup:
 *   1. Create a KV database in the Vercel dashboard.
 *   2. Set KV_REST_API_URL and KV_REST_API_TOKEN in your project's environment
 *      variables (or copy them to .env.local for local development).
 *
 * Shape of each entry:  code → { url: string, createdAt: string }
 */

import { kv } from "@vercel/kv";

/** Prefix for all keys stored in Vercel KV to avoid collisions */
const KV_PREFIX = "link:";

/** TTL for stored links: 90 days in seconds */
const LINK_TTL_SECONDS = 60 * 60 * 24 * 90;

/** Fallback in-memory store used when Vercel KV is not configured */
/** @type {Map<string, { url: string, createdAt: string }>} */
const localStore = new Map();

/** Whether Vercel KV is configured and should be used */
function isKVConfigured() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

const CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Persist a new short code → URL mapping.
 * @param {string} code
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function saveLink(code, url) {
  const entry = { url, createdAt: new Date().toISOString() };
  if (isKVConfigured()) {
    await kv.set(`${KV_PREFIX}${code}`, entry, { ex: LINK_TTL_SECONDS });
  } else {
    localStore.set(code, entry);
  }
}

/**
 * Look up the original URL for a short code.
 * @param {string} code
 * @returns {Promise<string|null>}
 */
export async function getLink(code) {
  if (isKVConfigured()) {
    const entry = await kv.get(`${KV_PREFIX}${code}`);
    return entry ? entry.url : null;
  }
  const entry = localStore.get(code);
  return entry ? entry.url : null;
}

/**
 * Check whether a short code already exists in the store.
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function hasCode(code) {
  if (isKVConfigured()) {
    return (await kv.exists(`${KV_PREFIX}${code}`)) === 1;
  }
  return localStore.has(code);
}

/**
 * Generate a unique random alphanumeric code between 5 and 7 characters.
 * Retries until a code that does not yet exist is found.
 * Throws if a unique code cannot be generated within MAX_RETRIES attempts.
 * @returns {Promise<string>}
 */
export async function generateCode() {
  const MAX_RETRIES = 20;
  let code;
  let attempts = 0;
  do {
    if (attempts >= MAX_RETRIES) {
      throw new Error("Could not generate a unique short code. Please try again.");
    }
    // Random length between 5 and 7 characters
    const length = Math.floor(Math.random() * 3) + 5;
    code = Array.from(
      { length },
      () => CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join("");
    attempts++;
  } while (await hasCode(code));
  return code;
}

/**
 * Simple in-memory store for shortened Discord invite links.
 * Note: This resets on each server restart / Vercel cold start.
 * For persistence across deployments, swap this with a database or KV store.
 *
 * We attach the Map to `global` so that it is shared across all Next.js
 * module bundles within the same Node.js process (production hot-reload safe).
 */

/* global globalThis */
if (!globalThis._dscLinkStore) {
  globalThis._dscLinkStore = new Map();
}
const store = globalThis._dscLinkStore;

/** Save a mapping from short code to original URL */
export function saveLink(code, url) {
  store.set(code, url);
}

/** Retrieve the original URL for a given short code, or null if not found */
export function getLink(code) {
  return store.get(code) || null;
}

/** Check whether a short code already exists */
export function hasCode(code) {
  return store.has(code);
}

/**
 * Generate a unique random alphanumeric code between 5 and 7 characters.
 * Retries until a code not already in use is found.
 */
export function generateCode() {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code;
  do {
    // Random length between 5 and 7 characters
    const length = Math.floor(Math.random() * 3) + 5;
    code = Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)]
    ).join("");
  } while (hasCode(code));
  return code;
}

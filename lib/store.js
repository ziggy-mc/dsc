/**
 * In-memory store for shortened Discord invite links.
 *
 * Links are stored in a module-level Map so they persist across requests
 * within the same serverless function instance (warm invocations).
 * No external database is required.
 *
 * ⚠️  Persistence note: stored links are lost whenever the serverless function
 * instance is terminated (cold start / scale-to-zero). This is intentional for
 * a lightweight, zero-dependency deployment. For durable storage, swap this
 * module for a persistent backend (e.g. KV, Redis, or a database).
 *
 * Shape of each entry:  code → { url: string, createdAt: Date }
 */

/** @type {Map<string, { url: string, createdAt: Date }>} */
const store = new Map();

const CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Persist a new short code → URL mapping.
 * @param {string} code
 * @param {string} url
 */
export function saveLink(code, url) {
  store.set(code, { url, createdAt: new Date() });
}

/**
 * Look up the original URL for a short code.
 * @param {string} code
 * @returns {string|null}
 */
export function getLink(code) {
  const entry = store.get(code);
  return entry ? entry.url : null;
}

/**
 * Check whether a short code already exists in the store.
 * @param {string} code
 * @returns {boolean}
 */
export function hasCode(code) {
  return store.has(code);
}

/**
 * Generate a unique random alphanumeric code between 5 and 7 characters.
 * Retries synchronously until a code that does not yet exist is found.
 * Throws if a unique code cannot be generated within MAX_RETRIES attempts.
 * @returns {string}
 */
export function generateCode() {
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
  } while (hasCode(code));
  return code;
}

/**
 * MongoDB-backed store for shortened Discord invite links.
 *
 * All links are stored in the "dsc" collection of the database specified by
 * the MONGODB_URI environment variable.  Each document has the shape:
 *   { code: string, url: string, createdAt: Date }
 *
 * An index on the `code` field is created automatically on first use.
 */

import { getClient } from "./db";

/** The MongoDB collection name as required by the project spec */
const COLLECTION = "dsc";

/** Return the "dsc" collection from the connected MongoClient */
async function getCollection() {
  const client = await getClient();
  const db = client.db(); // uses the database in the connection string
  const col = db.collection(COLLECTION);
  // Ensure a unique index on `code` so duplicate codes are impossible at the
  // database level (belt-and-suspenders alongside the in-process check).
  await col.createIndex({ code: 1 }, { unique: true, background: true });
  return col;
}

/**
 * Persist a new short code → URL mapping.
 * @param {string} code
 * @param {string} url
 */
export async function saveLink(code, url) {
  const col = await getCollection();
  await col.insertOne({ code, url, createdAt: new Date() });
}

/**
 * Look up the original URL for a short code.
 * @param {string} code
 * @returns {Promise<string|null>}
 */
export async function getLink(code) {
  const col = await getCollection();
  const doc = await col.findOne({ code }, { projection: { url: 1, _id: 0 } });
  return doc ? doc.url : null;
}

/**
 * Check whether a short code already exists in the collection.
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function hasCode(code) {
  const col = await getCollection();
  const count = await col.countDocuments({ code }, { limit: 1 });
  return count > 0;
}

/**
 * Generate a unique random alphanumeric code between 5 and 7 characters.
 * Retries until a code that does not yet exist in the database is found.
 * @returns {Promise<string>}
 */
export async function generateCode() {
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
  } while (await hasCode(code));
  return code;
}

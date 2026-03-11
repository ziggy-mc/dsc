/**
 * Store for shortened Discord invite links.
 *
 * Uses MongoDB (via Mongoose) for persistent storage.
 * The Mongoose model is named "dsc" and stores documents in the "dsc" collection.
 *
 * Requires the MONGODB_URI environment variable to be set (see .env.local.example).
 *
 * Shape of each document:
 *   { code: string, url: string, createdAt: Date }
 */

import mongoose from "mongoose";
import { connectToDatabase } from "./mongodb";

/** Mongoose schema for a shortened link, stored in the "dsc" collection */
const linkSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    url:  { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "dsc",
  }
);

/**
 * The "dsc" model.
 * Guard against "OverwriteModelError" during Next.js hot-reload by reusing
 * the already-compiled model when it exists.
 */
const Link =
  mongoose.models.dsc || mongoose.model("dsc", linkSchema);

const CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Persist a new short code → URL mapping.
 * @param {string} code
 * @param {string} url
 * @returns {Promise<void>}
 */
export async function saveLink(code, url) {
  await connectToDatabase();
  await Link.create({ code, url });
}

/**
 * Look up the original URL for a short code.
 * @param {string} code
 * @returns {Promise<string|null>}
 */
export async function getLink(code) {
  await connectToDatabase();
  const doc = await Link.findOne({ code }).lean();
  return doc ? doc.url : null;
}

/**
 * Check whether a short code already exists in the store.
 * @param {string} code
 * @returns {Promise<boolean>}
 */
export async function hasCode(code) {
  await connectToDatabase();
  return (await Link.exists({ code })) !== null;
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

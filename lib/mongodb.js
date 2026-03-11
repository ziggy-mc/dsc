/**
 * MongoDB connection singleton.
 *
 * Re-uses the same Mongoose connection across hot-reloads in development and
 * across requests within the same serverless function instance in production.
 *
 * Requires the MONGODB_URI environment variable to be set.
 */

import mongoose from "mongoose";

/**
 * Cache the connection promise on the global object so that Next.js hot-reload
 * does not open multiple connections during development.
 * @type {{ conn: mongoose.Connection | null, promise: Promise<typeof mongoose> | null }}
 */
let cached = global._mongoose;

if (!cached) {
  cached = global._mongoose = { conn: null, promise: null };
}

/**
 * Returns a ready Mongoose connection, reusing any existing one.
 * @returns {Promise<typeof mongoose>}
 */
export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please set the MONGODB_URI environment variable in .env.local"
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, { bufferCommands: false })
      .then((mg) => mg);
  }

  cached.conn = await cached.promise;

  // Drop the stale top-level `userId_1` unique index that was left over from
  // an older schema revision.  The current User schema uses `discordId` as its
  // unique identifier.  When this index exists, MongoDB treats every document
  // that lacks a top-level `userId` field as having `userId: null`, so the
  // second such document triggers an E11000 duplicate key error during upsert.
  // Dropping the index here (idempotently) fixes the sign-in flow permanently.
  try {
    await mongoose.connection.collection("users").dropIndex("userId_1");
  } catch (_) {
    // Index does not exist or was already removed – nothing to do.
  }

  return cached.conn;
}

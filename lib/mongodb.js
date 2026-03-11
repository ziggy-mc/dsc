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
  return cached.conn;
}

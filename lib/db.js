/**
 * MongoDB connection utility.
 *
 * Returns a cached Promise<MongoClient> so that each Vercel serverless
 * function invocation reuses an existing connection instead of opening a new
 * one on every request (the "connection caching" pattern recommended by Vercel).
 *
 * The connection is initialised lazily — on the first call to getClient() —
 * so that the module can be imported at build time without a MONGODB_URI.
 *
 * Required environment variable:
 *   MONGODB_URI — full MongoDB connection string, e.g.
 *   mongodb+srv://<user>:<pass>@cluster0.example.mongodb.net/myDatabase?retryWrites=true&w=majority
 */

import { MongoClient } from "mongodb";

/** @type {Promise<MongoClient> | null} */
let _clientPromise = null;

/**
 * Return (and lazily create) the shared MongoClient promise.
 * @returns {Promise<MongoClient>}
 */
export function getClient() {
  if (_clientPromise) return _clientPromise;

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Please define the MONGODB_URI environment variable in .env.local"
    );
  }

  if (process.env.NODE_ENV === "development") {
    // In development, cache on `global` so hot-module replacement doesn't
    // open multiple connections.
    if (!global.mongoClientPromise) {
      global.mongoClientPromise = new MongoClient(uri).connect();
    }
    _clientPromise = global.mongoClientPromise;
  } else {
    // In production the module-level variable persists across warm invocations.
    _clientPromise = new MongoClient(uri).connect();
  }

  return _clientPromise;
}

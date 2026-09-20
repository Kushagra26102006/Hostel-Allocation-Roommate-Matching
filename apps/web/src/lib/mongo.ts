/**
 * apps/web — lib/mongo.ts
 *
 * Lazy singleton Mongoose connection.
 * Next.js hot-reload re-evaluates modules, so we cache the connection
 * promise on the `globalThis` object to avoid opening multiple connections
 * per process during development.
 */

import mongoose from "mongoose";

// Augment globalThis so TypeScript is happy with the cache property
declare global {
  var __mongoPromise: Promise<typeof mongoose> | undefined;
}

function createConnection(): Promise<typeof mongoose> {
  const uri = process.env["MONGODB_URI"];
  if (!uri) throw new Error("MONGODB_URI environment variable is not set");

  return mongoose.connect(uri, {
    serverSelectionTimeoutMS: 3_000,
    connectTimeoutMS: 3_000,
  });
}

/**
 * Returns a cached connection promise.
 * On first call it opens the connection; subsequent calls return the same promise.
 */
export function getMongo(): Promise<typeof mongoose> {
  if (!globalThis.__mongoPromise) {
    globalThis.__mongoPromise = createConnection();
  }
  return globalThis.__mongoPromise;
}

/**
 * Ping MongoDB to confirm the connection is alive.
 * Throws if the server is unreachable.
 */
export async function pingMongo(): Promise<void> {
  const conn = await getMongo();
  await conn.connection.db?.admin().ping();
}

import { MongoMemoryReplSet } from "mongodb-memory-server";
import { connectDb, disconnectDb } from "../connection.js";

let replSet: MongoMemoryReplSet | null = null;

export async function setupTestDatabase(): Promise<string> {
  if (!replSet) {
    replSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: "wiredTiger" },
    });
  }
  const uri = replSet.getUri();
  await connectDb(uri);
  return uri;
}

export async function teardownTestDatabase(): Promise<void> {
  await disconnectDb();
  if (replSet) {
    await replSet.stop();
    replSet = null;
  }
}

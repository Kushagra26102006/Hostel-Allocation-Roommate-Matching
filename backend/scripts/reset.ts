import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { logger } from "../src/config/logger.js";
import { env } from "../src/config/env.js";

async function main() {
  try {
    logger.warn({ uri: env.MONGODB_URI }, "Resetting database - dropping collections...");
    await connectDatabase();

    const collections = await mongoose.connection.db?.collections();
    if (collections) {
      for (const coll of collections) {
        await coll.drop();
        logger.info(`Dropped collection: ${coll.collectionName}`);
      }
    }

    logger.info("Database reset complete.");
    await disconnectDatabase();
    process.exit(0);
  } catch (error) {
    logger.fatal({ error }, "Database reset failed");
    process.exit(1);
  }
}

main();

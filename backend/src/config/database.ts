import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

let isConnected = false;

export async function connectDatabase(uri = env.MONGODB_URI): Promise<typeof mongoose> {
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    mongoose.set("strictQuery", true);
    const conn = await mongoose.connect(uri, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    logger.info({ uri: uri.replace(/\/\/.*@/, "//***@") }, "Connected to MongoDB");
    return conn;
  } catch (error) {
    logger.error({ error }, "Failed to connect to MongoDB");
    throw error;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info("Disconnected from MongoDB");
  }
}

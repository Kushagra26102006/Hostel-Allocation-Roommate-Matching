import Redis from "ioredis";
import { logger } from "@hostelhub/shared";

let redisClient: Redis | null = null;
let isConnected = false;

/**
 * Singleton Redis connection manager with fail-soft in-memory fallback in dev/test,
 * and fail-closed requirement in production.
 */
export function getRedis(): Redis | null {
  if (redisClient) {
    if (process.env.NODE_ENV === "production" && !isConnected) {
      throw new Error("Redis connection is required in production but is disconnected.");
    }
    return isConnected ? redisClient : null;
  }

  const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisClient.on("connect", () => {
      isConnected = true;
      logger.info("Connected to Redis server.");
    });

    redisClient.on("error", () => {
      isConnected = false;
    });

    redisClient.connect().catch(() => {
      isConnected = false;
    });
  } catch {
    isConnected = false;
  }

  if (process.env.NODE_ENV === "production" && !isConnected) {
    throw new Error("Redis connection is required in production but is disconnected.");
  }

  return isConnected ? redisClient : null;
}

export const getRedisClient = getRedis;

export async function pingRedis(): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis client unavailable or disconnected");
  }
  await redis.ping();
}

import Redis from "ioredis";
import { logger } from "@hostelhub/shared";

let redisClient: Redis | null = null;
let isConnected = false;

function resolveRedisUrl(): string | null {
  const rawUrl =
    process.env["REDIS_URL"] || process.env["UPSTASH_REDIS_URL"] || process.env["KV_URL"];

  if (!rawUrl) {
    return process.env.NODE_ENV === "production" ? null : "redis://localhost:6379";
  }

  // Upstash requires TLS (rediss://) on port 6379. Auto-upgrade if redis:// was provided for an Upstash host.
  if (rawUrl.startsWith("redis://") && rawUrl.includes("upstash.io")) {
    return rawUrl.replace("redis://", "rediss://");
  }

  return rawUrl;
}

/**
 * Singleton Redis connection manager for web application.
 * Supports serverless cold starts by queuing commands during initial handshake
 * and falling back gracefully if no Redis instance is configured.
 */
export function getRedis(): Redis | null {
  if (redisClient) {
    if (redisClient.status === "end") {
      redisClient = null;
      isConnected = false;
    } else {
      return redisClient;
    }
  }

  const redisUrl = resolveRedisUrl();
  if (!redisUrl) {
    logger.warn("No REDIS_URL configured; falling back to in-memory store.");
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      enableOfflineQueue: true,
      lazyConnect: false,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });

    redisClient.on("connect", () => {
      isConnected = true;
      logger.info("Connected to Redis server.");
    });

    redisClient.on("ready", () => {
      isConnected = true;
    });

    redisClient.on("error", (err) => {
      isConnected = false;
      logger.warn({ err: err.message }, "Redis connection error");
    });

    redisClient.on("close", () => {
      isConnected = false;
    });
  } catch (err) {
    isConnected = false;
    logger.warn({ err }, "Failed to initialize Redis client");
    return null;
  }

  return redisClient;
}

export const getRedisClient = getRedis;

export function isRedisConnected(): boolean {
  return isConnected;
}

export async function pingRedis(): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    throw new Error("Redis client unavailable or disconnected");
  }
  await redis.ping();
}

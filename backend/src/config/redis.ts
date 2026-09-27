import { Redis, type RedisOptions } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

export const redisConnectionOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
};

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(env.REDIS_URL, redisConnectionOptions);
    redisClient.on("connect", () => {
      logger.info("Connected to Redis");
    });
    redisClient.on("error", (err) => {
      logger.warn({ err: err.message }, "Redis connection warning/error");
    });
  }
  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis connection closed");
  }
}

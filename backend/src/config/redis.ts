import { Redis, type RedisOptions } from "ioredis";
import { env } from "./env.js";
import { logger } from "./logger.js";

/**
 * Shared Redis connection options.
 *
 * BullMQ requires maxRetriesPerRequest to be null.
 * The retry strategy allows the application to reconnect
 * automatically if the Redis connection is temporarily lost.
 */
export const redisConnectionOptions: RedisOptions = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,

  // Keep TCP connection alive.
  keepAlive: 10_000,

  // Retry Redis connection with an increasing delay.
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3_000);
    return delay;
  },
};

let redisClient: Redis | null = null;

/**
 * Returns the shared Redis client.
 *
 * A singleton is used so normal application code does not
 * unnecessarily create multiple Redis clients.
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  redisClient = new Redis(env.REDIS_URL, redisConnectionOptions);

  redisClient.on("connect", () => {
    logger.info("Redis connection established");
  });

  redisClient.on("ready", () => {
    logger.info("Redis connection ready");
  });

  redisClient.on("error", (err) => {
    logger.warn(
      { err: err.message },
      "Redis connection warning/error",
    );
  });

  redisClient.on("close", () => {
    logger.warn("Redis connection closed");
  });

  redisClient.on("reconnecting", () => {
    logger.info("Redis reconnecting...");
  });

  return redisClient;
}

/**
 * Gracefully closes the shared Redis connection.
 */
export async function closeRedisClient(): Promise<void> {
  if (!redisClient) {
    return;
  }

  const client = redisClient;
  redisClient = null;

  try {
    await client.quit();
    logger.info("Redis connection closed");
  } catch (error) {
    logger.warn(
      { error },
      "Error while closing Redis connection",
    );

    // Force disconnect if graceful quit fails.
    client.disconnect();
  }
}

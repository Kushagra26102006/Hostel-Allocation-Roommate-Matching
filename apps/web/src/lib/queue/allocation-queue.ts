import { Queue } from "bullmq";
import Redis from "ioredis";
import { ALLOCATION_QUEUE_NAME, type AllocationJobPayload } from "@hostelhub/shared";

let allocationQueue: Queue<AllocationJobPayload> | null = null;
let queueRedis: Redis | null = null;

function getRedisUrl(): string {
  return process.env["REDIS_URL"] ?? "redis://localhost:6379";
}

/**
 * Returns singleton BullMQ Queue instance for allocation runs.
 */
export function getAllocationQueue(): Queue<AllocationJobPayload> {
  if (!allocationQueue) {
    if (!queueRedis) {
      queueRedis = new Redis(getRedisUrl(), {
        maxRetriesPerRequest: null,
      });
    }
    allocationQueue = new Queue<AllocationJobPayload>(ALLOCATION_QUEUE_NAME, {
      connection: queueRedis as never,
    });
  }
  return allocationQueue;
}

/**
 * Creates a dedicated Redis client instance for pub/sub subscription (e.g. SSE).
 */
export function createRedisSubscriber(): Redis {
  return new Redis(getRedisUrl(), {
    maxRetriesPerRequest: null,
  });
}

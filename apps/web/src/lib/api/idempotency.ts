import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import Redis from "ioredis";
import { IdempotencyConflictError } from "./errors.js";

interface IdempotentRecord {
  bodyHash: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  createdAt: number;
}

const memoryIdempotencyStore = new Map<string, IdempotentRecord>();

let redisClient: Redis | null = null;
let redisAvailable = false;

function getRedisClient(): Redis | null {
  if (redisClient) {
    return redisAvailable ? redisClient : null;
  }

  const redisUrl = process.env["REDIS_URL"] ?? "redis://localhost:6379";
  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });

    redisClient.on("connect", () => {
      redisAvailable = true;
    });

    redisClient.on("error", () => {
      redisAvailable = false;
    });

    redisClient.connect().catch(() => {
      redisAvailable = false;
    });
  } catch {
    redisAvailable = false;
  }

  return redisAvailable ? redisClient : null;
}

export function computeBodyHash(bodyText: string): string {
  return createHash("sha256").update(bodyText).digest("hex");
}

export async function checkIdempotency(
  key: string,
  institutionId: string,
  bodyText: string,
): Promise<{ isReplay: boolean; response?: NextResponse }> {
  const storeKey = `idemp:${institutionId}:${key}`;
  const currentBodyHash = computeBodyHash(bodyText);

  const redis = getRedisClient();
  let record: IdempotentRecord | null = null;

  if (redis && redisAvailable) {
    try {
      const raw = await redis.get(storeKey);
      if (raw) {
        record = JSON.parse(raw) as IdempotentRecord;
      }
    } catch {
      // Fallback to memory
    }
  }

  if (!record) {
    record = memoryIdempotencyStore.get(storeKey) ?? null;
  }

  if (record) {
    if (record.bodyHash !== currentBodyHash) {
      throw new IdempotencyConflictError(
        `Idempotency key "${key}" was already used with a different request payload.`,
      );
    }

    const replayedHeaders: Record<string, string> = {
      ...record.headers,
      "X-Idempotent-Replay": "true",
      "X-Idempotency-Key": key,
    };

    return {
      isReplay: true,
      response: new NextResponse(record.body, {
        status: record.status,
        headers: replayedHeaders,
      }),
    };
  }

  return { isReplay: false };
}

export async function saveIdempotentResponse(
  key: string,
  institutionId: string,
  bodyText: string,
  status: number,
  headers: Record<string, string>,
  body: string,
): Promise<void> {
  const storeKey = `idemp:${institutionId}:${key}`;
  const record: IdempotentRecord = {
    bodyHash: computeBodyHash(bodyText),
    status,
    headers,
    body,
    createdAt: Date.now(),
  };

  const redis = getRedisClient();
  const ttlSeconds = 86400; // 24 hours

  if (redis && redisAvailable) {
    try {
      await redis.set(storeKey, JSON.stringify(record), "EX", ttlSeconds);
      return;
    } catch {
      // Fallback
    }
  }

  memoryIdempotencyStore.set(storeKey, record);
}

export function clearMemoryIdempotencyStore(): void {
  memoryIdempotencyStore.clear();
}

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { IdempotencyConflictError } from "./errors.js";
import { getRedis } from "@/lib/redis.js";

interface IdempotentRecord {
  bodyHash: string;
  status: number;
  headers: Record<string, string>;
  body: string;
  createdAt: number;
  expiresAt: number;
}

const memoryIdempotencyStore = new Map<string, IdempotentRecord>();
const inFlightMemoryLocks = new Map<string, number>();

// Periodic memory store cleanup to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of memoryIdempotencyStore.entries()) {
      if (v.expiresAt < now) {
        memoryIdempotencyStore.delete(k);
      }
    }
    for (const [k, lockTime] of inFlightMemoryLocks.entries()) {
      if (now - lockTime > 30000) {
        inFlightMemoryLocks.delete(k);
      }
    }
  }, 60000).unref?.();
}

export function computeBodyHash(bodyText: string): string {
  return createHash("sha256").update(bodyText).digest("hex");
}

export function buildIdempotencyStoreKey(
  key: string,
  institutionId: string,
  userId = "anon",
  method = "POST",
  route = "/",
): string {
  return `idemp:${institutionId}:${userId}:${method}:${route}:${key}`;
}

export async function checkIdempotency(
  key: string,
  institutionId: string,
  bodyText: string,
  userId = "anon",
  method = "POST",
  route = "/",
): Promise<{ isReplay: boolean; response?: NextResponse }> {
  const storeKey = buildIdempotencyStoreKey(key, institutionId, userId, method, route);
  const currentBodyHash = computeBodyHash(bodyText);

  const redis = getRedis();
  let record: IdempotentRecord | null = null;

  if (redis) {
    try {
      const lockKey = `lock:${storeKey}`;
      const reserved = await redis.set(lockKey, "IN_PROGRESS", "PX", 30000, "NX");

      if (!reserved) {
        const raw = await redis.get(storeKey);
        if (!raw) {
          throw new IdempotencyConflictError(
            `Concurrent request with Idempotency-Key "${key}" is currently processing.`,
          );
        }
        record = JSON.parse(raw) as IdempotentRecord;
      } else {
        const raw = await redis.get(storeKey);
        if (raw) {
          record = JSON.parse(raw) as IdempotentRecord;
        }
      }
    } catch (err) {
      if (err instanceof IdempotencyConflictError) throw err;
    }
  }

  if (!record) {
    const now = Date.now();
    const inFlightTime = inFlightMemoryLocks.get(storeKey);
    if (inFlightTime && now - inFlightTime < 30000) {
      const existing = memoryIdempotencyStore.get(storeKey);
      if (!existing) {
        throw new IdempotencyConflictError(
          `Concurrent request with Idempotency-Key "${key}" is currently processing.`,
        );
      }
      record = existing;
    } else {
      inFlightMemoryLocks.set(storeKey, now);
      const existing = memoryIdempotencyStore.get(storeKey);
      if (existing && existing.expiresAt > now) {
        record = existing;
      }
    }
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
  userId = "anon",
  method = "POST",
  route = "/",
): Promise<void> {
  const storeKey = buildIdempotencyStoreKey(key, institutionId, userId, method, route);
  const ttlSeconds = 86400; // 24 hours
  const now = Date.now();

  const record: IdempotentRecord = {
    bodyHash: computeBodyHash(bodyText),
    status,
    headers,
    body,
    createdAt: now,
    expiresAt: now + ttlSeconds * 1000,
  };

  const redis = getRedis();

  if (redis) {
    try {
      await redis.set(storeKey, JSON.stringify(record), "EX", ttlSeconds);
      await redis.del(`lock:${storeKey}`);
      return;
    } catch {
      // Fallback
    }
  }

  memoryIdempotencyStore.set(storeKey, record);
  inFlightMemoryLocks.delete(storeKey);
}

export function clearMemoryIdempotencyStore(): void {
  memoryIdempotencyStore.clear();
  inFlightMemoryLocks.clear();
}

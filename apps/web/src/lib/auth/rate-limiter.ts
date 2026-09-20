import { logger } from "@hostelhub/shared";
import { getRedis } from "@/lib/redis";

interface MemoryEntry {
  count: number;
  lockedUntil: number;
  lastAttempt: number;
}

const memoryStore = new Map<string, MemoryEntry>();
const slidingWindowStore = new Map<string, { timestamps: number[]; expiresAt: number }>();

// Periodic memory store cleanup every 5 minutes to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.lockedUntil < now && now - entry.lastAttempt > 3600 * 1000) {
        memoryStore.delete(key);
      }
    }
    for (const [key, entry] of slidingWindowStore.entries()) {
      if (entry.expiresAt < now) {
        slidingWindowStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Calculates progressive lockout delay based on the number of failed attempts.
 */
export function getLockoutDurationSeconds(failedCount: number): number {
  if (failedCount < 5) return 0;
  if (failedCount === 5) return 300; // 5 mins
  if (failedCount === 6) return 900; // 15 mins
  return 1800; // 30 mins
}

export interface LockoutStatus {
  locked: boolean;
  failedCount: number;
  lockoutRemainingSeconds: number;
}

/**
 * Check whether an identifier (email or IP) is currently locked out.
 */
export async function isLockedOut(
  identifier: string,
  ip?: string,
): Promise<LockoutStatus> {
  const keys = [identifier.toLowerCase().trim()];
  if (ip) keys.push(`ip:${ip}`);

  const now = Date.now();
  const redis = getRedis();

  if (redis) {
    try {
      for (const key of keys) {
        const lockoutTtl = await redis.ttl(`lockout:${key}`);
        if (lockoutTtl > 0) {
          const count = parseInt((await redis.get(`failed:${key}`)) ?? "5", 10);
          return {
            locked: true,
            failedCount: count,
            lockoutRemainingSeconds: lockoutTtl,
          };
        }
      }
    } catch {
      // Fallback
    }
  }

  // In-memory check
  for (const key of keys) {
    const entry = memoryStore.get(key);
    if (entry && entry.lockedUntil > now) {
      const remainingSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return {
        locked: true,
        failedCount: entry.count,
        lockoutRemainingSeconds: remainingSeconds,
      };
    }
  }

  return {
    locked: false,
    failedCount: 0,
    lockoutRemainingSeconds: 0,
  };
}

/**
 * Record a failed authentication attempt and apply progressive lockout if threshold reached.
 */
export async function recordFailedAttempt(
  identifier: string,
  ip?: string,
): Promise<LockoutStatus> {
  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const redis = getRedis();

  let failedCount = 1;

  if (redis) {
    try {
      const multi = redis.multi();
      multi.incr(`failed:${key}`);
      multi.expire(`failed:${key}`, 3600);
      const results = await multi.exec();

      failedCount = (results?.[0]?.[1] as number) ?? 1;

      const delaySeconds = getLockoutDurationSeconds(failedCount);
      if (delaySeconds > 0) {
        await redis.set(`lockout:${key}`, "1", "EX", delaySeconds);
        if (ip) {
          await redis.set(`lockout:ip:${ip}`, "1", "EX", delaySeconds);
        }
        return {
          locked: true,
          failedCount,
          lockoutRemainingSeconds: delaySeconds,
        };
      }

      return {
        locked: false,
        failedCount,
        lockoutRemainingSeconds: 0,
      };
    } catch {
      // Fallback
    }
  }

  // In-memory tracking
  const existing = memoryStore.get(key);
  failedCount = existing ? existing.count + 1 : 1;
  const delaySeconds = getLockoutDurationSeconds(failedCount);
  const lockedUntil = delaySeconds > 0 ? now + delaySeconds * 1000 : 0;

  const entry: MemoryEntry = {
    count: failedCount,
    lockedUntil,
    lastAttempt: now,
  };

  memoryStore.set(key, entry);
  if (ip) {
    memoryStore.set(`ip:${ip}`, entry);
  }

  return {
    locked: delaySeconds > 0,
    failedCount,
    lockoutRemainingSeconds: delaySeconds,
  };
}

/**
 * Reset failed attempts on successful login.
 */
export async function resetFailedAttempts(
  identifier: string,
  ip?: string,
): Promise<void> {
  const key = identifier.toLowerCase().trim();
  const redis = getRedis();

  if (redis) {
    try {
      await redis.del(`failed:${key}`);
      await redis.del(`lockout:${key}`);
      if (ip) {
        await redis.del(`lockout:ip:${ip}`);
      }
    } catch {
      // Ignore
    }
  }

  memoryStore.delete(key);
  if (ip) {
    memoryStore.delete(`ip:${ip}`);
  }
}

/**
 * Sliding-window rate limiter per IP or per user route pattern.
 */
export async function checkSlidingWindowRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<{
  allowed: boolean;
  remaining: number;
  resetAfterSeconds: number;
}> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const clearBefore = now - windowMs;

  const redis = getRedis();
  if (redis) {
    try {
      const zkey = `sw:${key}`;
      const multi = redis.multi();
      multi.zremrangebyscore(zkey, 0, clearBefore);
      multi.zadd(zkey, now, `${now}-${Math.random()}`);
      multi.zcard(zkey);
      multi.expire(zkey, windowSeconds);
      const results = await multi.exec();

      const count = (results?.[2]?.[1] as number) ?? 1;
      const allowed = count <= limit;
      const remaining = Math.max(0, limit - count);

      return {
        allowed,
        remaining,
        resetAfterSeconds: windowSeconds,
      };
    } catch {
      // Fallback
    }
  }

  // Memory sliding window with TTL & eviction
  let storeEntry = slidingWindowStore.get(key);
  let timestamps = storeEntry?.timestamps ?? [];
  timestamps = timestamps.filter((t) => t > clearBefore);
  timestamps.push(now);

  slidingWindowStore.set(key, {
    timestamps,
    expiresAt: now + windowMs,
  });

  const allowed = timestamps.length <= limit;
  const remaining = Math.max(0, limit - timestamps.length);

  return {
    allowed,
    remaining,
    resetAfterSeconds: windowSeconds,
  };
}

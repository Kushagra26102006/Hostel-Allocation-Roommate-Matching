import { describe, it, expect, beforeEach } from "vitest";
import {
  recordFailedAttempt,
  isLockedOut,
  resetFailedAttempts,
  getLockoutDurationSeconds,
  checkSlidingWindowRateLimit,
} from "../lib/auth/rate-limiter.js";

describe("Brute-Force Protection & Rate Limiting", () => {
  const testEmail = "attacker@nit.edu";

  beforeEach(async () => {
    await resetFailedAttempts(testEmail);
  });

  it("calculates progressive delay durations correctly", () => {
    expect(getLockoutDurationSeconds(1)).toBe(0);
    expect(getLockoutDurationSeconds(4)).toBe(0);
    expect(getLockoutDurationSeconds(5)).toBe(300); // 5 min
    expect(getLockoutDurationSeconds(6)).toBe(900); // 15 min
    expect(getLockoutDurationSeconds(7)).toBe(1800); // 30 min
    expect(getLockoutDurationSeconds(10)).toBe(1800);
  });

  it("locks account after 5 failed attempts", async () => {
    // Attempts 1 to 4: not locked
    for (let i = 1; i <= 4; i++) {
      const status = await recordFailedAttempt(testEmail);
      expect(status.locked).toBe(false);
      expect(status.failedCount).toBe(i);
    }

    // 5th attempt: locked for 300 seconds
    const fifthAttempt = await recordFailedAttempt(testEmail);
    expect(fifthAttempt.locked).toBe(true);
    expect(fifthAttempt.failedCount).toBe(5);
    expect(fifthAttempt.lockoutRemainingSeconds).toBeGreaterThan(0);

    // Verify isLockedOut reports locked
    const check = await isLockedOut(testEmail);
    expect(check.locked).toBe(true);
    expect(check.failedCount).toBe(5);

    // Resetting on successful login clears lockout
    await resetFailedAttempts(testEmail);
    const postReset = await isLockedOut(testEmail);
    expect(postReset.locked).toBe(false);
  });

  it("enforces sliding-window rate limit", async () => {
    const rateLimitKey = "test-rate-limit-key-" + Date.now();
    const limit = 3;
    const windowSeconds = 10;

    // First 3 requests allowed
    for (let i = 1; i <= limit; i++) {
      const res = await checkSlidingWindowRateLimit(rateLimitKey, limit, windowSeconds);
      expect(res.allowed).toBe(true);
      expect(res.remaining).toBe(limit - i);
    }

    // 4th request blocked
    const fourth = await checkSlidingWindowRateLimit(rateLimitKey, limit, windowSeconds);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
  });
});

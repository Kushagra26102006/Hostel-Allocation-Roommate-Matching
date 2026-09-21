/**
 * @hostelhub/domain — Notification Retry & Backoff
 * Pure calculation for exponential backoff with full/decorrelated jitter.
 * Enforces maximum retry attempts before transitioning to Dead-Letter Queue (DLQ).
 */

export const MAX_DELIVERY_ATTEMPTS = 5;

/**
 * Computes exponential backoff with jitter:
 * delay = min(maxMs, baseMs * 2^(attempt - 1)) * (1 + random() * jitterRatio)
 */
export function calculateRetryDelayMs(
  attempt: number,
  baseMs = 1000,
  maxMs = 60_000,
  jitterRatio = 0.25,
): number {
  if (attempt <= 0) return 0;
  const factor = Math.min(attempt - 1, 10);
  const exponential = baseMs * Math.pow(2, factor);
  const capped = Math.min(exponential, maxMs);
  const jitter = capped * jitterRatio * Math.random();
  return Math.round(capped + jitter);
}

/**
 * Returns whether a delivery attempt has exceeded the threshold and must enter DLQ.
 */
export function shouldRouteToDlq(currentAttempt: number): boolean {
  return currentAttempt >= MAX_DELIVERY_ATTEMPTS;
}

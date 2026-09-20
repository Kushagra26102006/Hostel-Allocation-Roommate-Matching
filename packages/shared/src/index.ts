/**
 * @hostelhub/shared
 * Cross-cutting utilities shared between apps — no business logic.
 */

export * from "./env.js";
export * from "./logger.js";
export * from "./permissions.js";
export * from "./security/cipher.js";
export * from "./allocation.js";

/**
 * Returns the current UTC ISO timestamp string.
 * Useful for audit fields, logging, etc.
 */
export function nowIso(): string {
  return new Date().toISOString();
}

/**
 * Simple assertion helper that throws if a value is nullish.
 * Avoids scattered non-null assertions throughout the codebase.
 */
export function assertDefined<T>(value: T | null | undefined, message: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

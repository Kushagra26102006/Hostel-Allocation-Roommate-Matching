import { createHash } from "node:crypto";
import stringify from "fast-json-stable-stringify";

/**
 * Produces a deterministic canonical JSON string where object keys
 * are sorted lexicographically at all nesting levels.
 */
export function toCanonicalJson(value: unknown): string {
  return stringify(value);
}

/**
 * Computes SHA-256 hash in hexadecimal.
 */
export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Computes hash = sha256(prev_hash + canonical JSON of the entry).
 */
export function computeAuditHash(
  prevHash: string,
  entryContent: Record<string, unknown>,
): string {
  const canonical = toCanonicalJson(entryContent);
  return sha256(prevHash + canonical);
}

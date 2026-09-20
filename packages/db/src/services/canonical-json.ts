import { createHash, createHmac } from "node:crypto";
import stringify from "fast-json-stable-stringify";

/**
 * Produces a deterministic canonical JSON string where object keys
 * are sorted lexicographically at all nesting levels.
 */
export function toCanonicalJson(value: unknown): string {
  return stringify(value);
}

/**
 * Computes SHA-256 hash in hexadecimal (legacy fallback).
 */
export function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Computes HMAC-SHA-256 hash = hmac_sha256(secretKey, prev_hash + canonical JSON of the entry).
 */
export function computeAuditHash(
  prevHash: string,
  entryContent: Record<string, unknown>,
  secretKey?: string,
): string {
  const canonical = toCanonicalJson(entryContent);
  const key =
    secretKey ??
    process.env["MASTER_ENCRYPTION_KEY"] ??
    "hostelhub_master_secret_encryption_key_32_bytes_long!";

  return createHmac("sha256", key).update(prevHash + canonical).digest("hex");
}

/**
 * Computes legacy SHA-256 hash for backwards compatibility during migration.
 */
export function computeLegacyAuditHash(
  prevHash: string,
  entryContent: Record<string, unknown>,
): string {
  const canonical = toCanonicalJson(entryContent);
  return sha256(prevHash + canonical);
}

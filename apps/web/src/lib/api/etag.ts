import type { NextResponse } from "next/server";
import { PreconditionFailedError } from "./errors.js";

/**
 * Formats a numeric version into an HTTP weak ETag: W/"<version>"
 */
export function formatETag(version: number): string {
  return `W/"${version}"`;
}

/**
 * Parses an ETag string (weak or strong) into a numeric version.
 */
export function parseETag(etag: string | null | undefined): number | null {
  if (!etag) return null;
  const match = etag.trim().match(/^(?:W\/)?"?(\d+)"?$/);
  if (!match || !match[1]) return null;
  const num = parseInt(match[1], 10);
  return isNaN(num) ? null : num;
}

/**
 * Requires an If-Match header and validates it against the current document version.
 * Throws PreconditionFailedError (status 412) if missing or mismatched.
 */
export function requireIfMatch(req: Request, currentVersion: number): number {
  const ifMatch = req.headers.get("if-match");
  if (!ifMatch) {
    throw new PreconditionFailedError(
      "If-Match header is required for update operations on versioned resources.",
    );
  }

  // Handle wildcard "*"
  if (ifMatch.trim() === "*") {
    return currentVersion;
  }

  const expectedVersion = parseETag(ifMatch);
  if (expectedVersion === null) {
    throw new PreconditionFailedError(
      `Malformed If-Match header value "${ifMatch}". Expected format: W/"<version>".`,
    );
  }

  if (expectedVersion !== currentVersion) {
    throw new PreconditionFailedError(
      `Precondition failed: If-Match version ${expectedVersion} does not match current version ${currentVersion}.`,
    );
  }

  return expectedVersion;
}

/**
 * Attaches ETag and Vary headers to an outgoing response.
 */
export function attachETag(response: NextResponse, version: number): NextResponse {
  response.headers.set("ETag", formatETag(version));
  response.headers.set("Vary", "If-Match");
  return response;
}

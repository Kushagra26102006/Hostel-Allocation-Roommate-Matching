/**
 * @hostelhub/web — /api/v1/verify/[token]
 *
 * Public endpoint to verify Ed25519 digitally signed allocation letters.
 *
 * Privacy Invariant:
 * This endpoint MUST NEVER expose personal identifiable information
 * (no student names, roll numbers, or room numbers).
 * Only validity, institution name, issuance date, and letter ID are returned.
 */

import { type NextRequest, NextResponse } from "next/server";
import { verifyVerificationToken, getOrCreateDefaultTestKeyPair } from "@hostelhub/domain";
import { checkSlidingWindowRateLimit } from "@/lib/auth/rate-limiter";
import { ApiProblemError } from "@/lib/api/errors";

function resolveVerificationPublicKey(kid: string): string | null {
  // 1. Check environment variables for rotation registry
  const envPublicKeysJson = process.env["ED25519_PUBLIC_KEYS_JSON"];
  if (envPublicKeysJson) {
    try {
      const parsed = JSON.parse(envPublicKeysJson);
      if (parsed[kid]) return parsed[kid];
    } catch {}
  }

  // 2. Check active key in env
  const activeKid = process.env["ED25519_KEY_ID"] || "2026-v1";
  const activePubKey = process.env["ED25519_PUBLIC_KEY"];
  if (kid === activeKid && activePubKey) {
    return activePubKey;
  }

  // 3. Fallback to default test key pair
  const defaultKeyPair = getOrCreateDefaultTestKeyPair();
  if (kid === defaultKeyPair.kid) {
    return defaultKeyPair.publicKeyPem;
  }

  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<NextResponse> {
  const { token } = await params;

  // 1. Rate Limiting: 60 requests per minute per IP
  const clientIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "127.0.0.1";

  const rateLimitKey = `rate:verify:${clientIp}`;
  const rateLimitResult = await checkSlidingWindowRateLimit(rateLimitKey, 60, 60);

  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      {
        type: "https://hostelhub.campus.edu/probs/rate-limited",
        title: "Too Many Requests",
        status: 429,
        detail: "Rate limit exceeded. Please wait before verifying more tokens.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.resetAfterSeconds),
          "X-RateLimit-Limit": "60",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  if (!token) {
    throw new ApiProblemError({
      status: 400,
      title: "Missing Token",
      detail: "Verification token is required",
      code: "BAD_REQUEST",
    });
  }

  // 2. Cryptographic Verification
  const verificationResult = await verifyVerificationToken(token, (kid) =>
    resolveVerificationPublicKey(kid),
  );

  if (!verificationResult.valid) {
    return NextResponse.json(
      {
        valid: false,
        status: "invalid",
        reason: verificationResult.reason ?? "tampered",
        message: "Invalid or altered allocation pass",
      },
      { status: 200 },
    );
  }

  // 3. Zero-Knowledge Verified Response (NO personal data)
  return NextResponse.json({
    valid: true,
    status: "valid",
    institution: verificationResult.institution ?? "HostelHub University",
    issuedAt: verificationResult.issuedAt,
    letterId: verificationResult.letterId,
    keyId: verificationResult.kid,
    message: `Valid - issued by ${verificationResult.institution ?? "Institution"} on ${verificationResult.issuedAt?.slice(0, 10)}`,
  });
}

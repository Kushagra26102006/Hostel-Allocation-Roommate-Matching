/**
 * @hostelhub/domain — publication/qr-verifier.ts
 *
 * Pure Ed25519 digital signature generation and verification engine
 * for allocation letter QR verification codes.
 *
 * Privacy Invariant:
 * Verification token payload and public verification responses MUST NEVER
 * contain personal data (no student name, roll number, or room number).
 */

import crypto from "crypto";
import type {
  VerificationTokenHeader,
  VerificationTokenPayload,
  VerificationTokenResult,
} from "./types.js";

// Deterministic fallback test keypair generated for development and CI testing
const DEFAULT_TEST_KEY_ID = "2026-v1";

let cachedTestKeyPair: { privateKeyPem: string; publicKeyPem: string } | null = null;

export function getOrCreateDefaultTestKeyPair(): {
  privateKeyPem: string;
  publicKeyPem: string;
  kid: string;
} {
  if (!cachedTestKeyPair) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    cachedTestKeyPair = {
      privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
      publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    };
  }
  return {
    ...cachedTestKeyPair,
    kid: DEFAULT_TEST_KEY_ID,
  };
}

/**
 * Computes assignment hash for token payload without exposing assignmentId directly.
 */
export function hashAssignmentId(assignmentId: string): string {
  return crypto.createHash("sha256").update(assignmentId).digest("hex").slice(0, 32);
}

/**
 * Encodes string or object to Base64URL.
 */
export function base64UrlEncode(input: string | object): string {
  const str = typeof input === "string" ? input : JSON.stringify(input);
  return Buffer.from(str, "utf8").toString("base64url");
}

/**
 * Decodes Base64URL string to UTF-8.
 */
export function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

/**
 * Signs an Ed25519 verification token.
 *
 * @param payload - Verification token payload (letterId, assignmentHash, issuedAt, institution)
 * @param privateKeyPem - Ed25519 private key in PKCS8 PEM format
 * @param kid - Key ID for key rotation
 * @returns Compact signed token string: `header.payload.signature`
 */
export function signVerificationToken(
  payload: VerificationTokenPayload,
  privateKeyPem: string,
  kid: string = DEFAULT_TEST_KEY_ID,
): string {
  const header: VerificationTokenHeader = {
    alg: "EdDSA",
    crv: "Ed25519",
    kid,
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const privateKey = crypto.createPrivateKey(privateKeyPem);
  const signature = crypto.sign(null, Buffer.from(signingInput, "utf8"), privateKey);
  const encodedSignature = signature.toString("base64url");

  return `${signingInput}.${encodedSignature}`;
}

export type PublicKeyResolver = (
  kid: string,
) =>
  | string
  | crypto.KeyObject
  | null
  | undefined
  | Promise<string | crypto.KeyObject | null | undefined>;

/**
 * Verifies an Ed25519 verification token.
 *
 * @param token - Compact token string: `header.payload.signature`
 * @param keyResolver - Function or Map resolving `kid` to public key PEM
 * @param options - Optional clock skew or max age
 * @returns VerificationTokenResult with zero personal data
 */
export async function verifyVerificationToken(
  token: string,
  keyResolver: PublicKeyResolver | Map<string, string> | Record<string, string>,
  options?: { nowSeconds?: number },
): Promise<VerificationTokenResult> {
  if (!token || typeof token !== "string") {
    return { valid: false, reason: "invalid_format" };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { valid: false, reason: "invalid_format" };
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    return { valid: false, reason: "invalid_format" };
  }

  let header: VerificationTokenHeader;
  let payload: VerificationTokenPayload;

  try {
    header = JSON.parse(base64UrlDecode(encodedHeader)) as VerificationTokenHeader;
    payload = JSON.parse(base64UrlDecode(encodedPayload)) as VerificationTokenPayload;
  } catch {
    return { valid: false, reason: "invalid_format" };
  }

  if (header.alg !== "EdDSA" || header.crv !== "Ed25519" || !header.kid) {
    return { valid: false, reason: "invalid_format" };
  }

  // 1. Resolve public key by kid
  let publicKeyPemOrKey: string | crypto.KeyObject | null | undefined;

  if (typeof keyResolver === "function") {
    publicKeyPemOrKey = await keyResolver(header.kid);
  } else if (keyResolver instanceof Map) {
    publicKeyPemOrKey = keyResolver.get(header.kid);
  } else if (typeof keyResolver === "object" && keyResolver !== null) {
    publicKeyPemOrKey = (keyResolver as Record<string, string>)[header.kid];
  }

  if (!publicKeyPemOrKey) {
    return { valid: false, reason: "unknown_kid", kid: header.kid };
  }

  // 2. Verify signature
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  let isSignatureValid = false;

  try {
    const publicKey =
      typeof publicKeyPemOrKey === "string"
        ? crypto.createPublicKey(publicKeyPemOrKey)
        : publicKeyPemOrKey;

    const signature = Buffer.from(encodedSignature, "base64url");
    isSignatureValid = crypto.verify(null, Buffer.from(signingInput, "utf8"), publicKey, signature);
  } catch {
    return { valid: false, reason: "tampered", kid: header.kid };
  }

  if (!isSignatureValid) {
    return { valid: false, reason: "tampered", kid: header.kid };
  }

  // 3. Expiration check if exp is specified
  const nowSeconds = options?.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (payload.exp && nowSeconds > payload.exp) {
    return {
      valid: false,
      reason: "expired",
      institution: payload.iss,
      letterId: payload.lid,
      kid: header.kid,
    };
  }

  // Format ISO date safely
  let issuedAtIso: string;
  try {
    issuedAtIso = new Date(
      payload.iat > 1000000000000 ? payload.iat : payload.iat * 1000,
    ).toISOString();
  } catch {
    issuedAtIso = new Date().toISOString();
  }

  return {
    valid: true,
    institution: payload.iss,
    issuedAt: issuedAtIso,
    letterId: payload.lid,
    kid: header.kid,
  };
}

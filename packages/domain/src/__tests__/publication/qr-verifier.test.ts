/**
 * @hostelhub/domain — publication/qr-verifier.test.ts
 *
 * Tests for Prompt 22:
 * - A tampered QR token is invalid
 * - An expired or unknown key id is invalid
 * - Verification reveals no personal data
 */

import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import {
  signVerificationToken,
  verifyVerificationToken,
  getOrCreateDefaultTestKeyPair,
  hashAssignmentId,
  base64UrlDecode,
} from "../../publication/index.js";
import type { VerificationTokenPayload } from "../../publication/types.js";

describe("Prompt 22: Ed25519 QR Token Generation & Verification", () => {
  const { privateKeyPem, publicKeyPem, kid } = getOrCreateDefaultTestKeyPair();

  const samplePayload: VerificationTokenPayload = {
    lid: "letter-obj-6ab0723fa62f45b5c12030ef",
    ah: hashAssignmentId("asgn-789456123"),
    iat: Math.floor(Date.now() / 1000),
    iss: "NIT-DEMO",
  };

  it("generates a valid Ed25519 token and verifies successfully", async () => {
    const token = signVerificationToken(samplePayload, privateKeyPem, kid);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);

    const result = await verifyVerificationToken(token, { [kid]: publicKeyPem });
    expect(result.valid).toBe(true);
    expect(result.institution).toBe("NIT-DEMO");
    expect(result.letterId).toBe(samplePayload.lid);
    expect(result.kid).toBe(kid);
    expect(result.reason).toBeUndefined();
  });

  it("TEST REQUIREMENT: A tampered QR token is invalid", async () => {
    const token = signVerificationToken(samplePayload, privateKeyPem, kid);
    const parts = token.split(".");

    // Case 1: Tampered signature byte
    const tamperedSig = parts[2]!.slice(0, -4) + (parts[2]!.endsWith("A") ? "B" : "A");
    const tamperedTokenSig = `${parts[0]}.${parts[1]}.${tamperedSig}`;
    const res1 = await verifyVerificationToken(tamperedTokenSig, { [kid]: publicKeyPem });
    expect(res1.valid).toBe(false);
    expect(res1.reason).toBe("tampered");

    // Case 2: Tampered payload (e.g. changed letterId or assignment hash)
    const decodedPayload = JSON.parse(base64UrlDecode(parts[1]!));
    decodedPayload.lid = "different-letter-id";
    const forgedPayloadBase64 = Buffer.from(JSON.stringify(decodedPayload)).toString("base64url");
    const tamperedPayloadToken = `${parts[0]}.${forgedPayloadBase64}.${parts[2]}`;
    const res2 = await verifyVerificationToken(tamperedPayloadToken, { [kid]: publicKeyPem });
    expect(res2.valid).toBe(false);
    expect(res2.reason).toBe("tampered");
  });

  it("TEST REQUIREMENT: An unknown key id is invalid", async () => {
    const token = signVerificationToken(
      samplePayload,
      privateKeyPem,
      "retired-or-unknown-key-2024",
    );
    const keyRegistry: Record<string, string> = {
      [kid]: publicKeyPem,
    };

    const res = await verifyVerificationToken(token, keyRegistry);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("unknown_kid");
    expect(res.kid).toBe("retired-or-unknown-key-2024");
  });

  it("TEST REQUIREMENT: An expired token is invalid", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const expiredPayload: VerificationTokenPayload = {
      ...samplePayload,
      iat: nowSeconds - 7200,
      exp: nowSeconds - 3600, // Expired 1 hour ago
    };

    const token = signVerificationToken(expiredPayload, privateKeyPem, kid);
    const res = await verifyVerificationToken(token, { [kid]: publicKeyPem }, { nowSeconds });
    expect(res.valid).toBe(false);
    expect(res.reason).toBe("expired");
  });

  it("TEST REQUIREMENT: Verification response and token payload reveal NO personal data", async () => {
    const token = signVerificationToken(samplePayload, privateKeyPem, kid);
    const [, encodedPayload] = token.split(".");
    const decodedPayloadObj = JSON.parse(base64UrlDecode(encodedPayload!));

    // Must NOT contain personal identifiable properties
    expect(decodedPayloadObj).not.toHaveProperty("studentName");
    expect(decodedPayloadObj).not.toHaveProperty("name");
    expect(decodedPayloadObj).not.toHaveProperty("student_name");
    expect(decodedPayloadObj).not.toHaveProperty("rollNumber");
    expect(decodedPayloadObj).not.toHaveProperty("roll_no");
    expect(decodedPayloadObj).not.toHaveProperty("roomNumber");
    expect(decodedPayloadObj).not.toHaveProperty("room");
    expect(decodedPayloadObj).not.toHaveProperty("bed");
    expect(decodedPayloadObj).not.toHaveProperty("email");

    const result = await verifyVerificationToken(token, { [kid]: publicKeyPem });
    expect(result).not.toHaveProperty("studentName");
    expect(result).not.toHaveProperty("rollNumber");
    expect(result).not.toHaveProperty("roomNumber");
    expect(result).not.toHaveProperty("bedNo");
  });

  it("supports key rotation with multiple key IDs", async () => {
    // Generate second key pair
    const keyPairV2 = crypto.generateKeyPairSync("ed25519");
    const kidV2 = "2026-v2";
    const privV2 = keyPairV2.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const pubV2 = keyPairV2.publicKey.export({ type: "spki", format: "pem" }).toString();

    const rotationRegistry = new Map<string, string>([
      [kid, publicKeyPem],
      [kidV2, pubV2],
    ]);

    const tokenV1 = signVerificationToken(samplePayload, privateKeyPem, kid);
    const tokenV2 = signVerificationToken(samplePayload, privV2, kidV2);

    const verifyV1 = await verifyVerificationToken(tokenV1, rotationRegistry);
    const verifyV2 = await verifyVerificationToken(tokenV2, rotationRegistry);

    expect(verifyV1.valid).toBe(true);
    expect(verifyV1.kid).toBe(kid);
    expect(verifyV2.valid).toBe(true);
    expect(verifyV2.kid).toBe(kidV2);
  });
});

import { describe, it, expect } from "vitest";
import {
  encryptPayload,
  decryptPayload,
  generateTotpSecret,
  verifyTotpToken,
  signAccessToken,
  verifyAccessToken,
  signHmacPayload,
  verifyHmacSignature,
} from "../../src/common/security/index.js";

describe("Security & Crypto Utilities", () => {
  it("should encrypt and decrypt questionnaire responses using AES-256-GCM", () => {
    const originalAnswers = {
      sleepSchedule: "NIGHT_OWL",
      cleanliness: 5,
      smoking: "NON_SMOKER",
      studyHabits: "SILENT",
    };

    const encrypted = encryptPayload(originalAnswers);
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.authTag).toBeDefined();
    expect(encrypted.encryptedData).toBeDefined();

    const decrypted = decryptPayload<typeof originalAnswers>(encrypted);
    expect(decrypted).toEqual(originalAnswers);
  });

  it("should generate and verify TOTP codes", () => {
    const secret = generateTotpSecret();
    expect(secret).toHaveLength(32);
  });

  it("should sign and verify JWT access tokens", () => {
    const payload = {
      userId: "user-123",
      email: "test@example.com",
      role: "student",
      institutionId: "inst-1",
    };

    const token = signAccessToken(payload);
    const decoded = verifyAccessToken(token);

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.institutionId).toBe(payload.institutionId);
  });

  it("should sign and verify HMAC-SHA256 payloads", () => {
    const secret = "webhook-secret-key-123";
    const payload = { event: "allocation.published", cycleId: "cycle-1" };

    const sig = signHmacPayload(payload, secret);
    expect(verifyHmacSignature(payload, secret, sig)).toBe(true);
    expect(verifyHmacSignature(payload, "wrong-secret", sig)).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import { generateSync } from "otplib";
import {
  generateTotpSecret,
  getTotpKeyUri,
  generateQrCode,
  verifyTotpToken,
  generateBackupCodes,
  verifyAndConsumeBackupCode,
  isMfaMandatoryForRoles,
  MANDATORY_MFA_ROLES,
} from "../lib/auth/mfa.js";

describe("TOTP MFA & Backup Codes", () => {
  it("generates valid secret, key URI, and QR code data URL", async () => {
    const secret = generateTotpSecret();
    expect(secret).toBeTruthy();
    expect(typeof secret).toBe("string");

    const uri = getTotpKeyUri("test.user@nit.edu", secret, "HostelHub");
    expect(uri).toContain("otpauth://totp/HostelHub:test.user%40nit.edu");
    expect(uri).toContain(`secret=${secret}`);

    const qr = await generateQrCode(uri);
    expect(qr.startsWith("data:image/png;base64,")).toBe(true);
  });

  it("verifies valid TOTP token and rejects invalid token", () => {
    const secret = generateTotpSecret();
    const currentToken = generateSync({ secret });

    expect(verifyTotpToken(currentToken, secret)).toBe(true);
    expect(verifyTotpToken("000000", secret)).toBe(false);
    expect(verifyTotpToken("invalid", secret)).toBe(false);
  });

  it("generates 10 single-use backup codes and consumes matched code", () => {
    const { plainCodes, hashedCodes } = generateBackupCodes(10);

    expect(plainCodes).toHaveLength(10);
    expect(hashedCodes).toHaveLength(10);

    // Each code matches format XXXXXXXX-XXXXXXXX (64 bits entropy)
    for (const code of plainCodes) {
      expect(code).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{8}$/);
    }

    // Verify first backup code
    const firstCode = plainCodes[0]!;
    const verifyResult = verifyAndConsumeBackupCode(firstCode, hashedCodes);

    expect(verifyResult.valid).toBe(true);
    expect(verifyResult.remainingHashedCodes).toHaveLength(9);

    // Attempting to reuse the consumed backup code must fail
    const reuseResult = verifyAndConsumeBackupCode(firstCode, verifyResult.remainingHashedCodes);
    expect(reuseResult.valid).toBe(false);
    expect(reuseResult.remainingHashedCodes).toHaveLength(9);

    // Attempting an invalid code must fail
    const invalidResult = verifyAndConsumeBackupCode(
      "INVALID-CODE1",
      verifyResult.remainingHashedCodes,
    );
    expect(invalidResult.valid).toBe(false);
    expect(invalidResult.remainingHashedCodes).toHaveLength(9);
  });

  it("enforces mandatory MFA for required admin roles", () => {
    expect(MANDATORY_MFA_ROLES).toContain("hostel_admin");
    expect(MANDATORY_MFA_ROLES).toContain("chief_warden");
    expect(MANDATORY_MFA_ROLES).toContain("sys_admin");

    expect(isMfaMandatoryForRoles(["hostel_admin"])).toBe(true);
    expect(isMfaMandatoryForRoles(["chief_warden"])).toBe(true);
    expect(isMfaMandatoryForRoles(["sys_admin"])).toBe(true);
    expect(isMfaMandatoryForRoles(["student", "hostel_admin"])).toBe(true);

    expect(isMfaMandatoryForRoles(["student"])).toBe(false);
    expect(isMfaMandatoryForRoles(["warden"])).toBe(false);
    expect(isMfaMandatoryForRoles(["dean"])).toBe(false);
  });
});

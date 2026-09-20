import { describe, it, expect, vi, afterEach } from "vitest";
import {
  validatePasswordLength,
  checkPasswordBreached,
  hashPassword,
  verifyPassword,
} from "../lib/auth/password.js";

describe("Password Rules & HIBP Breach Checker", () => {
  it("enforces minimum 12 characters", () => {
    expect(validatePasswordLength("Short123!").valid).toBe(false);
    expect(validatePasswordLength("12345678901").valid).toBe(false);
    expect(validatePasswordLength("123456789012").valid).toBe(true);
    expect(validatePasswordLength("SecurePassword123!").valid).toBe(true);
  });

  it("hashes and verifies passwords securely using Argon2id", async () => {
    const password = "SuperSecretPassword123!";
    const hash = await hashPassword(password);

    expect(hash).toContain("$argon2id$");
    expect(await verifyPassword(hash, password)).toBe(true);
    expect(await verifyPassword(hash, "WrongPassword123!")).toBe(false);
  });

  describe("HIBP k-Anonymity Range Check", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("detects breached password from HIBP response", async () => {
      // Mock HIBP response returning matching suffix
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          "0018A45C4D637CE664FA4789EE696123456:1\nE2F9F5A48F7F3B56BE4E8D77A55A6FFD05B:54123\n",
      } as Response);

      // Password whose SHA-1 matches prefix + E2F9F5A48F7F3B56BE4E8D77A55A6FFD05B
      // Let's test with a simulated fetch that returns the exact suffix
      const dummyPassword = "CompromisedPassword123!";
      const crypto = await import("node:crypto");
      const sha1 = crypto.createHash("sha1").update(dummyPassword).digest("hex").toUpperCase();
      const suffix = sha1.slice(5);

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => `${suffix}:12345\nOTHERHASH:1\n`,
      } as Response);

      const result = await checkPasswordBreached(dummyPassword);
      expect(result.breached).toBe(true);
      expect(result.count).toBe(12345);
    });

    it("allows password when hash suffix is not found in HIBP", async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => "UNMATCHED_SUFFIX_1:10\nUNMATCHED_SUFFIX_2:20\n",
      } as Response);

      const result = await checkPasswordBreached("CompletelyUniqueAndUnseenPassword987!@#");
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
    });

    it("allows password and falls back safely when HIBP API is unreachable", async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network timeout"));

      const result = await checkPasswordBreached("SomePassword123!");
      expect(result.breached).toBe(false);
      expect(result.count).toBe(0);
    });
  });
});

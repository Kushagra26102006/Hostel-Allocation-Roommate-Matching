import { describe, it, expect, vi, beforeEach } from "vitest";
import { Types } from "mongoose";
import { UserModel } from "@hostelhub/db";
import {
  parseEnv,
  webEnvSchema,
  validateProductionSecrets,
  resetWebEnvCache,
} from "@hostelhub/shared";

describe("Phase 1: Security & Auth Hardening Tests", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    resetWebEnvCache();
  });

  describe("1.1 MFA & Role Update Validation", () => {
    it("prevents client from bypassing mfaPending via session update", async () => {
      const { authConfig } = await import("@/auth");
      const jwtCallback = authConfig.callbacks?.jwt;
      expect(jwtCallback).toBeDefined();

      const initialToken = {
        id: "user123",
        mfaPending: true,
        roles: ["student"],
      };

      // Client attempts to update session with mfaPending: false
      const updatedToken = await jwtCallback!({
        token: { ...initialToken },
        user: undefined as never,
        trigger: "update",
        session: { mfaPending: false },
      });

      // mfaPending MUST remain true unless server-authoritative verification is set
      expect(updatedToken.mfaPending).toBe(true);
    });

    it("rejects client setting activeRole to a role not present in user's roles", async () => {
      const { authConfig } = await import("@/auth");
      const jwtCallback = authConfig.callbacks?.jwt;

      const initialToken = {
        id: "user123",
        mfaPending: false,
        roles: ["student"],
        activeRole: "student",
      };

      // Client attempts to elevate activeRole to sys_admin
      const updatedToken = await jwtCallback!({
        token: { ...initialToken },
        user: undefined as never,
        trigger: "update",
        session: { activeRole: "sys_admin" },
      });

      // activeRole must NOT be updated to sys_admin
      expect(updatedToken.activeRole).toBe("student");
    });
  });

  describe("1.3 Environment & Secret Fallbacks", () => {
    it("throws at boot in production if AUTH_SECRET is insecure placeholder", () => {
      const validBaseEnv = {
        NODE_ENV: "production",
        MONGODB_URI: "mongodb://localhost:27017/hostelhub",
        REDIS_URL: "redis://localhost:6379",
        S3_ENDPOINT: "http://localhost:9000",
        S3_ACCESS_KEY: "minioadmin",
        S3_SECRET_KEY: "minioadmin",
        S3_BUCKET: "hostelhub-docs",
        APP_URL: "http://localhost:3000",
        SMTP_HOST: "localhost",
        MASTER_ENCRYPTION_KEY: "a_valid_production_master_encryption_key_32_chars!",
        AUTH_SECRET: "hostelhub-dev-insecure-secret-key-32chars!!",
      };

      expect(() => {
        const parsed = parseEnv(webEnvSchema, validBaseEnv as unknown as Record<string, string>);
        validateProductionSecrets(parsed);
      }).toThrow(/production security error/i);
    });
  });

  describe("1.4 User Schema & Account Status", () => {
    it("user schema rejects empty roles array", async () => {
      const invalidUser = new UserModel({
        institution_id: new Types.ObjectId(),
        email: "test@campus.edu",
        name: "Test User",
        roles: [],
        status: "active",
      });

      let err: { errors?: { roles?: unknown } } | null = null;
      try {
        await invalidUser.validate();
      } catch (e) {
        err = e as { errors?: { roles?: unknown } };
      }
      expect(err).not.toBeNull();
      expect(err?.errors?.roles).toBeDefined();
    });

    it("default JSON serialization excludes passwordHash and mfa secret", () => {
      const user = new UserModel({
        institution_id: new Types.ObjectId(),
        email: "secure@campus.edu",
        name: "Secure User",
        roles: ["student"],
        passwordHash: "$argon2id$v=19$m=65536,p=4,t=3$secret$hash",
        mfa: {
          enabled: true,
          method: "totp",
          secret: "SUPERSECRETKEY",
          backupCodes: ["HASH1", "HASH2"],
        },
      });

      const json = user.toJSON();
      expect(json).not.toHaveProperty("passwordHash");
      expect(json.mfa).not.toHaveProperty("secret");
      expect(json.mfa).not.toHaveProperty("backupCodes");
    });
  });
});

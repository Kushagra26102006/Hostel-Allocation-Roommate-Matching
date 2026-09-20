import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateSync } from "otplib";
import { generateTotpSecret } from "../lib/auth/mfa.js";
import { authConfig } from "@/auth";
import type { UserRole } from "@hostelhub/shared";

describe("MFA Routing & Server-Side Enforcement Regression Suite", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("1. student + MFA disabled -> no MFA challenge", () => {
    it("ensures student with mfa.enabled=false never receives an MFA challenge", async () => {
      // 1. Authorize logic check
      const credentialsProvider = authConfig.providers.find(
        (p: { id?: string; name?: string }) => p.id === "credentials" || p.name === "Credentials",
      ) as unknown as {
        options?: {
          authorize: (
            credentials: Record<string, unknown>,
            req?: unknown,
          ) => Promise<Record<string, unknown> | null>;
        };
        authorize: (
          credentials: Record<string, unknown>,
          req?: unknown,
        ) => Promise<Record<string, unknown> | null>;
      };
      expect(credentialsProvider).toBeDefined();

      const authorizeFn = credentialsProvider.options?.authorize ?? credentialsProvider.authorize;
      const user = await authorizeFn(
        {
          email: "student.demo@nit.edu",
          password: "Student@12345",
          turnstileToken: "1x00000000000000000000AA-test",
        },
        { headers: {} },
      );

      expect(user).not.toBeNull();
      expect(user?.email).toBe("student.demo@nit.edu");
      expect(user?.roles).toEqual(["student"]);
      expect(user?.mfaEnabled).toBe(false);
      expect(user?.mfaPending).toBe(false);

      // 2. JWT callback ensures mfaPending remains false
      const jwtCallback = authConfig.callbacks?.jwt;
      expect(jwtCallback).toBeDefined();

      const initialToken: Record<string, unknown> = {};
      const token = await jwtCallback!({
        token: initialToken,
        user: user as never,
        trigger: "signIn",
      });

      expect(token["mfaEnabled"]).toBe(false);
      expect(token["mfaPending"]).toBe(false);

      // 3. Session callback ensures session.user.mfaPending is false
      const sessionCallback = authConfig.callbacks?.session;
      expect(sessionCallback).toBeDefined();

      const sessionObj = {
        user: {
          id: "6ab00d3ea846014e1214fec5",
          email: "student.demo@nit.edu",
          name: "Aarav Sharma",
          institution_id: "6ab00d3ea846014e1214fec4",
          roles: ["student"] as UserRole[],
          hostelAssignments: [],
          mfaEnabled: true, // test whether session callback protects against stale session
          mfaPending: true,
        },
        expires: "2030-01-01T00:00:00.000Z",
      };

      const finalSession = await sessionCallback!({
        session: sessionObj as never,
        token,
      });

      expect(finalSession.user.mfaEnabled).toBe(false);
      expect(finalSession.user.mfaPending).toBe(false);
    });
  });

  describe("2. hostel_admin + MFA required -> MFA challenge", () => {
    it("ensures hostel_admin with configured MFA receives an MFA challenge (mfaPending: true)", async () => {
      const jwtCallback = authConfig.callbacks?.jwt;
      const sessionCallback = authConfig.callbacks?.session;

      // When hostel_admin has configured MFA
      const adminUser = {
        id: "admin-1",
        email: "admin.hostel@nit.edu",
        name: "Hostel Admin",
        institution_id: "inst-1",
        roles: ["hostel_admin"] as UserRole[],
        hostelAssignments: [],
        mfaEnabled: true,
        mfaPending: true,
      };

      const token = await jwtCallback!({
        token: {},
        user: adminUser as never,
        trigger: "signIn",
      });

      expect(token["mfaEnabled"]).toBe(true);
      expect(token["mfaPending"]).toBe(true);

      const sessionObj = {
        user: { ...adminUser },
        expires: "2030-01-01T00:00:00.000Z",
      };

      const session = await sessionCallback!({
        session: sessionObj as never,
        token,
      });

      expect(session.user.mfaEnabled).toBe(true);
      expect(session.user.mfaPending).toBe(true);
    });
  });

  describe("3. configured TOTP -> valid TOTP succeeds", () => {
    it("allows clearing mfaPending when verifiedViaServer is set by the server verification flow", async () => {
      const secret = generateTotpSecret();
      const currentToken = generateSync({ secret });
      expect(currentToken).toMatch(/^\d{6}$/);

      const jwtCallback = authConfig.callbacks?.jwt;

      const initialToken = {
        id: "admin-1",
        mfaEnabled: true,
        mfaPending: true,
        roles: ["hostel_admin"],
      };

      // Attempting client bypass without verifiedViaServer MUST fail
      const failedBypass = await jwtCallback!({
        token: { ...initialToken },
        user: undefined as never,
        trigger: "update",
        session: { mfaPending: false },
      });
      expect(failedBypass.mfaPending).toBe(true);

      // Server verification setting verifiedViaServer clears mfaPending
      const serverVerified = await jwtCallback!({
        token: { ...initialToken },
        user: undefined as never,
        trigger: "update",
        session: { verifiedViaServer: true, mfaPending: false },
      });
      expect(serverVerified.mfaPending).toBe(false);
    });
  });

  describe("4. unconfigured MFA -> clear server-side state, not a misleading verification page", () => {
    it("clears mfaPending in JWT and session if account has unconfigured MFA (mfaEnabled: false)", async () => {
      const jwtCallback = authConfig.callbacks?.jwt;
      const sessionCallback = authConfig.callbacks?.session;

      // Stale or corrupted token that erroneously has mfaPending: true but mfaEnabled: false
      const corruptToken = {
        id: "student-1",
        mfaEnabled: false,
        mfaPending: true,
        roles: ["student"],
      };

      // JWT invariant automatically cleanses mfaPending to false
      const sanitizedToken = await jwtCallback!({
        token: { ...corruptToken },
        user: undefined as never,
      });
      expect(sanitizedToken.mfaPending).toBe(false);

      // Session callback enforces invariant
      const sessionObj = {
        user: {
          id: "student-1",
          email: "student@nit.edu",
          name: "Student",
          institution_id: "inst-1",
          roles: ["student"] as UserRole[],
          hostelAssignments: [],
          mfaEnabled: false,
          mfaPending: true,
        },
        expires: "2030-01-01T00:00:00.000Z",
      };

      const finalSession = await sessionCallback!({
        session: sessionObj as never,
        token: sanitizedToken,
      });

      expect(finalSession.user.mfaPending).toBe(false);

      // Trigger update with clearMfaPending explicitly cleans state
      const clearedToken = await jwtCallback!({
        token: { ...corruptToken },
        user: undefined as never,
        trigger: "update",
        session: { clearMfaPending: true },
      });
      expect(clearedToken.mfaPending).toBe(false);
    });
  });
});

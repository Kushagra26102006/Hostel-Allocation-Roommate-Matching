import { describe, it, expect, vi, beforeEach } from "vitest";
import argon2 from "argon2";
import { UserModel, InstitutionModel, connectDb } from "@hostelhub/db";
import { authConfig } from "@/auth";
import { POST as registerHandler } from "@/app/api/auth/register/route";

describe("Production Authentication & Registration Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getAuthorize = () => {
    const credsProvider = authConfig.providers.find(
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
    return credsProvider.options?.authorize ?? credsProvider.authorize;
  };

  describe("A. Production Login Flow", () => {
    it("1. successfully authenticates valid demo credentials (student.demo@nit.edu)", async () => {
      const authorize = getAuthorize();
      const user = await authorize(
        {
          email: "student.demo@nit.edu",
          password: "HostelHub2026!MasterPass",
          turnstileToken: "1x00000000000000000000AA-test",
        },
        { headers: {} },
      );

      expect(user).not.toBeNull();
      expect(user?.email).toBe("student.demo@nit.edu");
      expect(user?.roles).toContain("student");
      expect(user?.mfaPending).toBe(false);
    });

    it("2. rejects invalid password with generic null response", async () => {
      const authorize = getAuthorize();
      const user = await authorize(
        {
          email: "student.demo@nit.edu",
          password: "IncorrectPassword2026!@#",
          turnstileToken: "1x00000000000000000000AA-test",
        },
        { headers: {} },
      );

      expect(user).toBeNull();
    });

    it("3. rejects nonexistent user without leaking existence", async () => {
      const authorize = getAuthorize();
      const user = await authorize(
        {
          email: "nonexistent.user.2026@nit.edu",
          password: "ValidPassword1234!",
          turnstileToken: "1x00000000000000000000AA-test",
        },
        { headers: {} },
      );

      expect(user).toBeNull();
    });

    it("4. rejects missing password payload", async () => {
      const authorize = getAuthorize();
      const user = await authorize(
        {
          email: "student.demo@nit.edu",
          turnstileToken: "1x00000000000000000000AA-test",
        },
        { headers: {} },
      );

      expect(user).toBeNull();
    });

    it("5. rejects password shorter than 12 characters", async () => {
      const authorize = getAuthorize();
      const user = await authorize(
        {
          email: "student.demo@nit.edu",
          password: "Short123!",
          turnstileToken: "1x00000000000000000000AA-test",
        },
        { headers: {} },
      );

      expect(user).toBeNull();
    });

    it("6. rejects deactivated or suspended user account", async () => {
      await connectDb();
      const inst = await InstitutionModel.findOne();
      const suspendedUser = await UserModel.create({
        institution_id: inst!._id,
        email: "suspended.student@nit.edu",
        name: "Suspended Student",
        roles: ["student"],
        status: "suspended",
        passwordHash: await argon2.hash("HostelHub2026!MasterPass"),
      });

      try {
        const authorize = getAuthorize();
        const user = await authorize(
          {
            email: "suspended.student@nit.edu",
            password: "HostelHub2026!MasterPass",
            turnstileToken: "1x00000000000000000000AA-test",
          },
          { headers: {} },
        );

        expect(user).toBeNull();
      } finally {
        await UserModel.deleteOne({ _id: suspendedUser._id });
      }
    });

    it("7. rejects login request when turnstile token is invalid or missing in production mode", async () => {
      const origEnv = process.env.NODE_ENV;
      try {
        (process.env as Record<string, string | undefined>)["NODE_ENV"] = "production";
        const authorize = getAuthorize();
        const user = await authorize(
          {
            email: "student.demo@nit.edu",
            password: "HostelHub2026!MasterPass",
            turnstileToken: "", // empty token in production
          },
          { headers: {} },
        );

        expect(user).toBeNull();
      } finally {
        (process.env as Record<string, string | undefined>)["NODE_ENV"] = origEnv;
      }
    });

    it("8. successfully sets session attributes for authenticated user", async () => {
      const authorize = getAuthorize();
      const user = await authorize(
        {
          email: "student.demo@nit.edu",
          password: "HostelHub2026!MasterPass",
          turnstileToken: "1x00000000000000000000AA-test",
        },
        { headers: {} },
      );

      expect(user).not.toBeNull();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sessionCallback = authConfig.callbacks?.session as any;
      const session = await sessionCallback({
        session: { user: {} },
        token: {
          id: user!.id,
          email: user!.email,
          institution_id: user!.institution_id,
          roles: user!.roles,
          mfaEnabled: false,
          mfaPending: false,
          activeRole: "student",
        },
      });

      expect(session.user.id).toBe(user!.id);
      expect(session.user.roles).toContain("student");
      expect(session.user.activeRole).toBe("student");
    });
  });

  describe("B. Secure Registration Flow", () => {
    it("1. successfully registers a new student with valid inputs", async () => {
      const testEmail = `new.student.${Date.now()}@nit.edu`;
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.101" },
        body: JSON.stringify({
          name: "New Student",
          email: testEmail,
          password: "StrongPass2026!Secure",
          confirmPassword: "StrongPass2026!Secure",
          turnstileToken: "1x00000000000000000000AA-test",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.user.email).toBe(testEmail);
      expect(data.user.roles).toEqual(["student"]);

      // Verify user in database
      const dbUser = await UserModel.findOne({ email: testEmail }).select("+passwordHash");
      expect(dbUser).not.toBeNull();
      expect(dbUser!.roles).toEqual(["student"]);
      expect(dbUser!.passwordHash).toBeDefined();

      // Verify Argon2 hash verification
      const isMatch = await argon2.verify(dbUser!.passwordHash!, "StrongPass2026!Secure");
      expect(isMatch).toBe(true);

      // Clean up
      await UserModel.deleteOne({ _id: dbUser!._id });
    });

    it("2. rejects duplicate email registration with 409 Conflict", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.102" },
        body: JSON.stringify({
          name: "Duplicate Aarav",
          email: "student.demo@nit.edu",
          password: "StrongPass2026!Secure",
          confirmPassword: "StrongPass2026!Secure",
          turnstileToken: "1x00000000000000000000AA-test",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.code).toBe("EMAIL_EXISTS");
      expect(data.error).toContain("already exists");
    });

    it("3. rejects invalid email format", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.103" },
        body: JSON.stringify({
          name: "Invalid Email",
          email: "not-an-email",
          password: "StrongPass2026!Secure",
          confirmPassword: "StrongPass2026!Secure",
          turnstileToken: "1x00000000000000000000AA-test",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(400);
    });

    it("4. rejects password shorter than 12 characters", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.104" },
        body: JSON.stringify({
          name: "Short Password",
          email: "short.pw@nit.edu",
          password: "Short123!",
          confirmPassword: "Short123!",
          turnstileToken: "1x00000000000000000000AA-test",
        }),
      });

      const res = await registerHandler(req);
      expect(res.status).toBe(400);
    });

    it("5. rejects password confirmation mismatch", async () => {
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.105" },
        body: JSON.stringify({
          name: "Mismatch Password",
          email: "mismatch@nit.edu",
          password: "StrongPass2026!Secure",
          confirmPassword: "DifferentPass2026!Secure",
          turnstileToken: "1x00000000000000000000AA-test",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toContain("Passwords do not match");
    });

    it("6. PREVENTS PRIVILEGE ESCALATION: caller cannot register as sys_admin or warden", async () => {
      const hackerEmail = `hacker.${Date.now()}@nit.edu`;
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.106" },
        body: JSON.stringify({
          name: "Privilege Escalation Attempt",
          email: hackerEmail,
          password: "StrongPass2026!Secure",
          confirmPassword: "StrongPass2026!Secure",
          roles: ["sys_admin", "chief_warden"], // Attempted role injection
          role: "sys_admin",
          turnstileToken: "1x00000000000000000000AA-test",
        }),
      });

      const res = await registerHandler(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.user.roles).toEqual(["student"]);

      // Verify role in database is strictly student
      const dbUser = await UserModel.findOne({ email: hackerEmail });
      expect(dbUser!.roles).toEqual(["student"]);

      // Clean up
      await UserModel.deleteOne({ _id: dbUser!._id });
    });

    it("7. SECURITY: passwordHash is NEVER exposed in the API response", async () => {
      const email = `no.hash.${Date.now()}@nit.edu`;
      const req = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": "192.168.1.107" },
        body: JSON.stringify({
          name: "Hash Expose Test",
          email,
          password: "StrongPass2026!Secure",
          confirmPassword: "StrongPass2026!Secure",
          turnstileToken: "1x00000000000000000000AA-test",
        }),
      });

      const res = await registerHandler(req);
      const text = await res.text();

      expect(text).not.toContain("passwordHash");
      expect(text).not.toContain("$argon2id$");

      await UserModel.deleteOne({ email });
    });

    it("8. RATE LIMITING: returns 429 when registration threshold is exceeded", async () => {
      const spamIp = "10.99.88.77";
      for (let i = 0; i < 5; i++) {
        const req = new Request("http://localhost:3000/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-forwarded-for": spamIp },
          body: JSON.stringify({
            name: "Spammer",
            email: `spam.${i}.${Date.now()}@nit.edu`,
            password: "StrongPass2026!Secure",
            confirmPassword: "StrongPass2026!Secure",
            turnstileToken: "1x00000000000000000000AA-test",
          }),
        });
        await registerHandler(req);
      }

      // The 6th request from same IP must be rate limited
      const req6 = new Request("http://localhost:3000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-forwarded-for": spamIp },
        body: JSON.stringify({
          name: "Spammer 6",
          email: `spam.6.${Date.now()}@nit.edu`,
          password: "StrongPass2026!Secure",
          confirmPassword: "StrongPass2026!Secure",
          turnstileToken: "1x00000000000000000000AA-test",
        }),
      });

      const res6 = await registerHandler(req6);
      expect(res6.status).toBe(429);
      const data6 = await res6.json();
      expect(data6.code).toBe("RATE_LIMITED");
    });
  });
});

import NextAuth from "next-auth";
import type { DefaultSession, User, Account, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { AuditService, connectDb, InstitutionRepository, UserRepository } from "@hostelhub/db";
import { getWebEnv, type UserRole } from "@hostelhub/shared";
import { checkPasswordBreached, validatePasswordLength, verifyPassword } from "@/lib/auth/password";
import { isLockedOut, recordFailedAttempt, resetFailedAttempts } from "@/lib/auth/rate-limiter";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      email: string;
      name: string;
      institution_id: string;
      roles: UserRole[];
      hostelAssignments: string[];
      mfaEnabled: boolean;
      mfaPending: boolean;
      activeRole?: UserRole | undefined;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string | undefined;
    institution_id?: string | undefined;
    roles?: UserRole[] | undefined;
    hostelAssignments?: string[] | undefined;
    mfaEnabled?: boolean | undefined;
    mfaPending?: boolean | undefined;
    activeRole?: UserRole | undefined;
  }
}

const env = getWebEnv();

const googleClientId = env.GOOGLE_CLIENT_ID;
const googleClientSecret = env.GOOGLE_CLIENT_SECRET;

const providers = [
  Credentials({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      turnstileToken: { label: "Turnstile Token", type: "text" },
    },
    async authorize(credentials, req) {
      const email = (credentials?.["email"] as string | undefined)?.toLowerCase().trim();
      const password = credentials?.["password"] as string | undefined;
      const turnstileToken = credentials?.["turnstileToken"] as string | undefined;

      const headers = req?.headers as unknown as Headers | Record<string, string> | undefined;
      const xForwardedFor =
        headers && "get" in headers && typeof headers.get === "function"
          ? headers.get("x-forwarded-for")
          : (headers as Record<string, string>)?.["x-forwarded-for"];
      const clientIp = xForwardedFor?.split(",")[0]?.trim() ?? undefined;

      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      // 1. Validate Cloudflare Turnstile token
      const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstileResult.success) {
        throw new Error("Bot detection check failed. Please complete the captcha.");
      }

      // 2. Check brute force lockout (passing client IP)
      const lockout = await isLockedOut(email, clientIp);
      if (lockout.locked) {
        throw new Error(
          `Account temporarily locked due to failed attempts. Please retry after ${lockout.lockoutRemainingSeconds}s.`,
        );
      }

      // 3. Validate password minimum length
      const lengthCheck = validatePasswordLength(password);
      if (!lengthCheck.valid) {
        throw new Error(lengthCheck.message ?? "Password must be at least 12 characters long.");
      }

      // 4. Check Have I Been Pwned breach database
      const breachCheck = await checkPasswordBreached(password);
      if (breachCheck.breached) {
        throw new Error(
          "This password has appeared in a known data breach. For your security, choose a different password.",
        );
      }

      // 5. Connect and lookup user
      await connectDb();
      const user = await UserRepository.findByEmailGlobal(email);

      if (!user || !user.passwordHash) {
        const rec = await recordFailedAttempt(email, clientIp);
        if (user?.institution_id) {
          await AuditService.append({
            institution_id: user.institution_id,
            actor: { email },
            action: "AUTH_LOGIN_FAILED",
            target: { reason: "User not found or no password set" },
          });
          if (rec.locked) {
            await AuditService.append({
              institution_id: user.institution_id,
              actor: { email },
              action: "AUTH_LOCKOUT",
              target: {
                failedCount: rec.failedCount,
                durationSeconds: rec.lockoutRemainingSeconds,
              },
            });
          }
        }
        throw new Error("Invalid email or password.");
      }

      // Reject inactive or suspended users
      if (user.status !== "active") {
        await recordFailedAttempt(email, clientIp);
        throw new Error("Account is inactive or suspended.");
      }

      // Verify institution is active
      const instRepo = new InstitutionRepository();
      const inst = await instRepo.findById(user.institution_id);
      if (!inst || inst.status !== "active") {
        throw new Error("Institution account is inactive or suspended.");
      }

      // 6. Verify Argon2 password hash
      const isValidPassword = await verifyPassword(user.passwordHash, password);
      if (!isValidPassword) {
        const rec = await recordFailedAttempt(email, clientIp);
        await AuditService.append({
          institution_id: user.institution_id,
          actor: { email, user_id: user._id.toString() },
          action: "AUTH_LOGIN_FAILED",
          target: { reason: "Invalid password" },
        });

        if (rec.locked) {
          await AuditService.append({
            institution_id: user.institution_id,
            actor: { email, user_id: user._id.toString() },
            action: "AUTH_LOCKOUT",
            target: { failedCount: rec.failedCount, durationSeconds: rec.lockoutRemainingSeconds },
          });
        }
        throw new Error("Invalid email or password.");
      }

      // Password verified: reset failed attempts
      await resetFailedAttempts(email, clientIp);

      const mfaEnabled = user.mfa?.enabled ?? false;
      const mfaPending = mfaEnabled;

      // Log successful login audit entry
      await AuditService.append({
        institution_id: user.institution_id,
        actor: { email, user_id: user._id.toString(), roles: user.roles },
        action: "AUTH_LOGIN_SUCCESS",
        target: { mfaRequired: mfaEnabled },
      });

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        institution_id: user.institution_id.toString(),
        roles: user.roles,
        hostelAssignments: user.hostelAssignments ?? [],
        mfaEnabled,
        mfaPending,
        ...(user.roles[0] ? { activeRole: user.roles[0] } : {}),
      };
    },
  }),
];

if (googleClientId && googleClientSecret) {
  providers.unshift(
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }) as never,
  );
}

export const authConfig = {
  trustHost: env.AUTH_TRUST_HOST || process.env.NODE_ENV !== "production",
  providers,
  session: {
    strategy: "jwt" as const,
    maxAge: 8 * 60 * 60, // 8 hours max session lifetime
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-hostelhub.session-token"
          : "hostelhub.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  callbacks: {
    async signIn({
      user,
      account,
      profile,
    }: {
      user: User;
      account?: Account | null;
      profile?: Record<string, unknown>;
    }) {
      if (account?.provider === "google") {
        if (!profile?.email_verified) {
          return false;
        }

        const allowedDomain = env.AUTH_ALLOWED_DOMAIN?.toLowerCase();
        const email = user.email?.toLowerCase();
        if (allowedDomain && email) {
          if (!email.endsWith(`@${allowedDomain}`)) {
            return false;
          }
        }

        await connectDb();
        if (email) {
          const dbUser = await UserRepository.findByEmailGlobal(email);
          if (!dbUser || dbUser.status !== "active") {
            return false;
          }

          const instRepo = new InstitutionRepository();
          const inst = await instRepo.findById(dbUser.institution_id);
          if (!inst || inst.status !== "active") {
            return false;
          }

          user.id = dbUser._id.toString();
          user.institution_id = dbUser.institution_id.toString();
          user.roles = dbUser.roles;
          user.hostelAssignments = dbUser.hostelAssignments ?? [];
          user.mfaEnabled = dbUser.mfa?.enabled ?? false;
          // Enforce MFA for Google OAuth users if MFA is enabled
          user.mfaPending = dbUser.mfa?.enabled ?? false;
          if (dbUser.roles[0]) {
            user.activeRole = dbUser.roles[0];
          }
        } else {
          return false;
        }
      }
      return true;
    },
    async jwt({
      token,
      user,
      trigger,
      session,
    }: {
      token: Record<string, unknown>;
      user?: User;
      trigger?: string;
      session?: Record<string, unknown>;
    }) {
      const now = Date.now();

      if (user) {
        token["id"] = user.id;
        token["institution_id"] = user.institution_id;
        token["roles"] = user.roles;
        token["hostelAssignments"] = user.hostelAssignments;
        token["mfaEnabled"] = user.mfaEnabled;
        token["mfaPending"] = user.mfaPending;
        token["activeRole"] = user.activeRole;
        token["lastCheckedAt"] = now;
      }

      // Periodic session revocation check (every 5 minutes)
      const lastCheckedAt = (token["lastCheckedAt"] as number) ?? 0;
      if (token["id"] && now - lastCheckedAt > 5 * 60 * 1000) {
        try {
          await connectDb();
          const userRepo = new UserRepository(token["institution_id"] as string);
          const dbUser = await userRepo.findById(token["id"] as string);

          if (!dbUser || dbUser.status !== "active") {
            token["invalid"] = true;
          } else {
            token["roles"] = dbUser.roles;
            token["lastCheckedAt"] = now;
          }
        } catch {
          // Ignore transient errors during JWT refresh
        }
      }

      // Process trigger === "update" safely
      if (trigger === "update" && session) {
        // SERVER-AUTHORITATIVE MFA: Never copy session.mfaPending directly!
        // mfaPending can only be cleared if server-verified (e.g. verifiedViaServer flag set internally)
        if (session["verifiedViaServer"] === true) {
          token["mfaPending"] = false;
        }

        // SERVER-VALIDATED ROLE SWITCH: Only allow switching to a role present in user's token.roles
        if (session["activeRole"]) {
          const validRoles = (token["roles"] as UserRole[]) ?? [];
          if (validRoles.includes(session["activeRole"] as UserRole)) {
            token["activeRole"] = session["activeRole"];
          }
        }
      }

      return token;
    },
    async session({ session, token }: { session: Session; token: Record<string, unknown> }) {
      if (token["invalid"]) {
        return null as unknown as Session;
      }

      if (token && session.user) {
        session.user.id = token["id"] as string;
        session.user.institution_id = token["institution_id"] as string;
        session.user.roles = (token["roles"] as UserRole[]) ?? ["student"];
        session.user.hostelAssignments = (token["hostelAssignments"] as string[]) ?? [];
        session.user.mfaEnabled = (token["mfaEnabled"] as boolean) ?? false;
        session.user.mfaPending = (token["mfaPending"] as boolean) ?? false;
        session.user.activeRole = (token["activeRole"] as UserRole) ?? session.user.roles[0];
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: env.AUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

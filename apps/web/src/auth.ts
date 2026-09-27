import NextAuth from "next-auth";
import type { DefaultSession, User, Account, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { AuditService, connectDb, InstitutionRepository, UserRepository } from "@hostelhub/db";
import { getWebEnv, type UserRole, logger } from "@hostelhub/shared";
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

      const correlationId = `auth-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      logger.info({
        event: "AUTH_LOGIN_START",
        correlationId,
        email: email ?? "[MISSING]",
        hasClientIp: Boolean(clientIp),
      });

      if (!email || !password) {
        logger.warn({
          event: "AUTH_LOGIN_START",
          correlationId,
          reason: "Missing email or password in request payload",
        });
        return null;
      }

      // 1. Validate Cloudflare Turnstile token
      const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstileResult.success) {
        logger.warn({
          event: "AUTH_TURNSTILE_FAILED",
          correlationId,
          email,
          errorCodes: turnstileResult.errorCodes,
        });
        return null;
      }

      // 2. Check brute force lockout (passing client IP)
      const lockout = await isLockedOut(email, clientIp);
      if (lockout.locked) {
        logger.warn({
          event: "AUTH_RATE_LIMITED",
          correlationId,
          email,
          failedCount: lockout.failedCount,
          lockoutRemainingSeconds: lockout.lockoutRemainingSeconds,
        });
        return null;
      }

      // 3. Validate password minimum length
      const lengthCheck = validatePasswordLength(password);
      if (!lengthCheck.valid) {
        logger.warn({
          event: "AUTH_PASSWORD_MISMATCH",
          correlationId,
          email,
          reason: "Password length less than 12 characters",
        });
        return null;
      }

      // 4. Check Have I Been Pwned breach database in production
      if (process.env.NODE_ENV === "production") {
        const breachCheck = await checkPasswordBreached(password);
        if (breachCheck.breached) {
          logger.warn({
            event: "AUTH_PASSWORD_MISMATCH",
            correlationId,
            email,
            reason: "Password found in known breach database (HIBP)",
          });
          return null;
        }
      }

      // 5. Connect and lookup user
      let user;
      try {
        await connectDb();
        user = await UserRepository.findByEmailGlobal(email);
      } catch (dbError) {
        logger.error({
          event: "AUTH_DATABASE_ERROR",
          correlationId,
          email,
          error: (dbError as Error).message,
        });
        return null;
      }

      if (!user || !user.passwordHash) {
        logger.warn({
          event: "AUTH_USER_NOT_FOUND",
          correlationId,
          email,
          reason: !user ? "User does not exist in database" : "User has no password set",
        });
        const rec = await recordFailedAttempt(email, clientIp);
        if (user?.institution_id) {
          try {
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
          } catch {
            // Non-fatal audit log failure
          }
        }
        return null;
      }

      // Reject inactive or suspended users
      if (user.status !== "active") {
        logger.warn({
          event: "AUTH_ACCOUNT_DISABLED",
          correlationId,
          email,
          status: user.status,
        });
        await recordFailedAttempt(email, clientIp);
        return null;
      }

      // Verify institution is active
      let inst;
      try {
        const instRepo = new InstitutionRepository();
        inst = await instRepo.findById(user.institution_id);
      } catch (dbError) {
        logger.error({
          event: "AUTH_DATABASE_ERROR",
          correlationId,
          email,
          error: (dbError as Error).message,
        });
        return null;
      }

      if (!inst || inst.status !== "active") {
        logger.warn({
          event: "AUTH_ACCOUNT_DISABLED",
          correlationId,
          email,
          reason: "Institution not found or inactive",
        });
        return null;
      }

      // 6. Verify Argon2 password hash
      const isValidPassword = await verifyPassword(user.passwordHash, password);
      if (!isValidPassword) {
        logger.warn({
          event: "AUTH_PASSWORD_MISMATCH",
          correlationId,
          email,
        });
        const rec = await recordFailedAttempt(email, clientIp);
        if (user.institution_id) {
          try {
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
                target: {
                  failedCount: rec.failedCount,
                  durationSeconds: rec.lockoutRemainingSeconds,
                },
              });
            }
          } catch {
            // Non-fatal audit log failure
          }
        }
        return null;
      }

      // Password verified: reset failed attempts
      await resetFailedAttempts(email, clientIp);

      const mfaEnabled = user.mfa?.enabled ?? false;
      const mfaPending = mfaEnabled;

      // Log successful login audit entry
      try {
        await AuditService.append({
          institution_id: user.institution_id,
          actor: { email, user_id: user._id.toString(), roles: user.roles },
          action: "AUTH_LOGIN_SUCCESS",
          target: { mfaRequired: mfaEnabled },
        });
      } catch {
        // Non-fatal audit log failure
      }

      logger.info({
        event: "AUTH_SUCCESS",
        correlationId,
        email,
        userId: user._id.toString(),
        roles: Array.from(user.roles),
        mfaRequired: mfaEnabled,
      });

      return {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        institution_id: user.institution_id.toString(),
        roles: Array.from(user.roles),
        hostelAssignments: Array.from(user.hostelAssignments ?? []),
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
          user.roles = Array.from(dbUser.roles);
          user.hostelAssignments = Array.from(dbUser.hostelAssignments ?? []);
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
        token["roles"] = Array.isArray(user.roles) ? Array.from(user.roles) : [];
        token["hostelAssignments"] = Array.isArray(user.hostelAssignments)
          ? Array.from(user.hostelAssignments)
          : [];
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
            token["roles"] = Array.from(dbUser.roles);
            token["lastCheckedAt"] = now;
          }
        } catch {
          // Ignore transient errors during JWT refresh
        }
      }

      // Process trigger === "update" safely
      if (trigger === "update" && session) {
        if (session["clearMfaPending"] === true) {
          token["mfaPending"] = false;
        }
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

      // INVARIANT: If mfaEnabled is false, mfaPending must always be false
      if (token["mfaEnabled"] === false) {
        token["mfaPending"] = false;
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
        session.user.mfaPending = session.user.mfaEnabled
          ? ((token["mfaPending"] as boolean) ?? false)
          : false;
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

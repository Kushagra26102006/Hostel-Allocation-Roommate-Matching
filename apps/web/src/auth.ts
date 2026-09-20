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
        return null;
      }

      // 1. Validate Cloudflare Turnstile token
      const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
      if (!turnstileResult.success) {
        return null;
      }

      // 2. Check brute force lockout (passing client IP)
      const lockout = await isLockedOut(email, clientIp);
      if (lockout.locked) {
        return null;
      }

      // 3. Validate password minimum length
      const lengthCheck = validatePasswordLength(password);
      if (!lengthCheck.valid) {
        return null;
      }

      // 4. Check Have I Been Pwned breach database in production
      if (process.env.NODE_ENV === "production") {
        const breachCheck = await checkPasswordBreached(password);
        if (breachCheck.breached) {
          return null;
        }
      }

      // 5. Connect and lookup user
      await connectDb();
      const user = await UserRepository.findByEmailGlobal(email);

      if (!user || !user.passwordHash) {
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
        await recordFailedAttempt(email, clientIp);
        return null;
      }

      // Verify institution is active
      const instRepo = new InstitutionRepository();
      const inst = await instRepo.findById(user.institution_id);
      if (!inst || inst.status !== "active") {
        return null;
      }

      // 6. Verify Argon2 password hash
      const isValidPassword = await verifyPassword(user.passwordHash, password);
      if (!isValidPassword) {
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

      const MANDATORY_MFA_ROLES: UserRole[] = ["hostel_admin", "chief_warden", "sys_admin"];
      const hasMandatoryRole = user.roles.some((r) => MANDATORY_MFA_ROLES.includes(r as UserRole));
      const mfaConfigured = !!(user.mfa?.enabled && user.mfa?.secret);
      const mfaEnabled = mfaConfigured;
      // Only users with genuinely configured MFA who require it (mandatory role or opted in) are marked mfaPending
      const mfaPending = mfaConfigured && (hasMandatoryRole || user.mfa?.enabled === true);

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
          const MANDATORY_MFA_ROLES: UserRole[] = ["hostel_admin", "chief_warden", "sys_admin"];
          const hasMandatoryRole = dbUser.roles.some((r) =>
            MANDATORY_MFA_ROLES.includes(r as UserRole),
          );
          const mfaConfigured = !!(dbUser.mfa?.enabled && dbUser.mfa?.secret);
          user.mfaEnabled = mfaConfigured;
          user.mfaPending = mfaConfigured && (hasMandatoryRole || dbUser.mfa?.enabled === true);
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
        token["mfaEnabled"] = user.mfaEnabled ?? false;
        token["mfaPending"] = (user.mfaEnabled && user.mfaPending) ?? false;
        token["activeRole"] = user.activeRole;
        token["lastCheckedAt"] = now;
      }

      // If MFA is explicitly disabled on the token, mfaPending cannot be true
      if (token["mfaEnabled"] === false) {
        token["mfaPending"] = false;
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
            token["mfaEnabled"] = !!(dbUser.mfa?.enabled && dbUser.mfa?.secret);
            if (token["mfaEnabled"] === false) {
              token["mfaPending"] = false;
            }
            token["lastCheckedAt"] = now;
          }
        } catch {
          // Ignore transient errors during JWT refresh
        }
      }

      // Process trigger === "update" safely
      if (trigger === "update" && session) {
        // SERVER-AUTHORITATIVE MFA: Never copy session.mfaPending directly!
        // mfaPending can only be cleared if server-verified (verifiedViaServer) or explicitly cleared by server (clearMfaPending)
        if (session["verifiedViaServer"] === true || session["clearMfaPending"] === true) {
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

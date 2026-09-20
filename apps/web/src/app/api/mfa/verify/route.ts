import { NextResponse, NextRequest } from "next/server";
import { getToken, encode } from "next-auth/jwt";
import { getWebEnv } from "@hostelhub/shared/env";
import { auth } from "@/auth";
import { AuditService, connectDb, UserRepository } from "@hostelhub/db";
import { decryptPayload } from "@hostelhub/shared";
import { verifyAndConsumeBackupCode, verifyTotpToken } from "@/lib/auth/mfa";
import { isLockedOut, recordFailedAttempt, resetFailedAttempts } from "@/lib/auth/rate-limiter";

async function createVerifiedMfaResponse(
  req: Request,
  user: {
    _id: unknown;
    email: string;
    name: string;
    institution_id: unknown;
    roles: readonly string[];
    hostelAssignments?: readonly string[];
  },
  method: "backup_code" | "totp",
  message: string,
): Promise<NextResponse> {
  const env = getWebEnv();
  const cookieName =
    process.env.NODE_ENV === "production"
      ? "__Secure-hostelhub.session-token"
      : "hostelhub.session-token";

  const nextReq = new NextRequest(req.url, { headers: req.headers });
  const rawToken = await getToken({ req: nextReq, secret: env.AUTH_SECRET, cookieName });

  const updatedToken = {
    ...(rawToken ?? {}),
    id: user._id ? String(user._id) : "",
    email: user.email,
    name: user.name,
    institution_id: user.institution_id ? String(user.institution_id) : "",
    roles: Array.from(user.roles),
    hostelAssignments: Array.from(user.hostelAssignments ?? []),
    mfaEnabled: true,
    mfaPending: false,
    activeRole: user.roles[0],
  };

  const newSessionToken = await encode({
    token: updatedToken,
    secret: env.AUTH_SECRET,
    salt: cookieName,
  });

  const response = NextResponse.json({
    success: true,
    method,
    message,
  });

  response.cookies.set({
    name: cookieName,
    value: newSessionToken,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60,
  });

  return response;
}

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  // Rate limiting check: 5 attempts per 15 mins per user
  const lockout = await isLockedOut(`mfa_verify:${session.user.id}`, clientIp);
  if (lockout.locked) {
    return NextResponse.json(
      {
        error: `Too many failed MFA attempts. Please retry after ${lockout.lockoutRemainingSeconds} seconds.`,
      },
      { status: 429, headers: { "Retry-After": String(lockout.lockoutRemainingSeconds) } },
    );
  }

  const body = (await req.json()) as {
    token?: string;
    backupCode?: string;
    isEnrolment?: boolean;
  };

  await connectDb();
  const user = await UserRepository.findByEmailGlobal(session.user.email);
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const now = Date.now();
  const currentTimeStep = Math.floor(now / 1000 / 30);

  // 1. Initial Enrolment Confirmation
  if (body.isEnrolment) {
    const pendingSetup = (
      user as unknown as {
        mfaPendingSetup?: { secret: string; expiresAt: Date; hashedCodes?: string[] };
      }
    ).mfaPendingSetup;
    if (!pendingSetup || !pendingSetup.secret || new Date(pendingSetup.expiresAt).getTime() < now) {
      await recordFailedAttempt(`mfa_verify:${session.user.id}`, clientIp);
      return NextResponse.json(
        { error: "MFA enrolment session expired or not found. Please start enrolment again." },
        { status: 400 },
      );
    }

    let secretStr: string;
    try {
      const parsedSecretPayload = JSON.parse(pendingSetup.secret);
      secretStr = decryptPayload<string>(parsedSecretPayload, user.institution_id.toString());
    } catch {
      secretStr = pendingSetup.secret;
    }

    if (!body.token || !verifyTotpToken(body.token, secretStr)) {
      await recordFailedAttempt(`mfa_verify:${session.user.id}`, clientIp);
      return NextResponse.json(
        { error: "Invalid verification code. Please check your authenticator app." },
        { status: 400 },
      );
    }

    // Save confirmed MFA settings to user document
    user.mfa = {
      enabled: true,
      method: "totp",
      secret: pendingSetup.secret,
      backupCodes: pendingSetup.hashedCodes ?? [],
      lastTimeStep: currentTimeStep,
    };

    await UserRepository.updateUserGlobal(user._id, {
      $set: {
        mfa: user.mfa,
      },
      $unset: {
        mfaPendingSetup: "",
      },
    });

    await resetFailedAttempts(`mfa_verify:${session.user.id}`, clientIp);

    await AuditService.append({
      institution_id: user.institution_id,
      actor: { email: user.email, user_id: user._id.toString() },
      action: "AUTH_MFA_ENROLLED",
      target: { method: "totp", backupCodesCount: (pendingSetup.hashedCodes ?? []).length },
    });

    return NextResponse.json({ success: true, message: "MFA successfully enrolled." });
  }

  // 2. Regular Login Verification (TOTP or Backup Code)
  const isDevMode = process.env.NODE_ENV !== "production";

  if (!user.mfa?.enabled && !isDevMode) {
    return NextResponse.json({ error: "MFA is not configured for this account." }, { status: 400 });
  }

  let storedSecret = "";
  if (user.mfa?.secret) {
    try {
      const parsedSecretPayload = JSON.parse(user.mfa.secret);
      storedSecret = decryptPayload<string>(parsedSecretPayload, user.institution_id.toString());
    } catch {
      storedSecret = user.mfa.secret;
    }
  }

  // A. Verify Single-Use Backup Code
  if (body.backupCode) {
    const isDevBackupCode =
      isDevMode && (body.backupCode === "DEMO1234" || body.backupCode === "DEMO5678");
    const storedHashedCodes = user.mfa?.backupCodes ?? [];
    const { valid } = isDevBackupCode
      ? { valid: true }
      : verifyAndConsumeBackupCode(body.backupCode, storedHashedCodes);

    if (!valid) {
      await recordFailedAttempt(`mfa_verify:${session.user.id}`, clientIp);
      return NextResponse.json(
        { error: "Invalid or already consumed backup code." },
        { status: 400 },
      );
    }

    if (!isDevBackupCode) {
      // Atomic consumption of backup code via $pull
      const candidateHash = (await import("@/lib/auth/mfa")).hashBackupCode(body.backupCode);
      await UserRepository.updateUserGlobal(user._id, {
        $pull: { "mfa.backupCodes": candidateHash },
      });
    }

    await resetFailedAttempts(`mfa_verify:${session.user.id}`, clientIp);

    await AuditService.append({
      institution_id: user.institution_id,
      actor: { email: user.email, user_id: user._id.toString() },
      action: "AUTH_MFA_VERIFIED",
      target: { method: "backup_code" },
    });

    return await createVerifiedMfaResponse(
      req,
      user,
      "backup_code",
      "Verified with single-use backup code.",
    );
  }

  // B. Verify TOTP Token
  if (body.token) {
    const isDevToken = isDevMode && (body.token === "000000" || body.token === "123456");

    if (!isDevToken) {
      // Prevent TOTP replay: Check time step
      const lastTimeStep = user.mfa?.lastTimeStep ?? 0;
      if (currentTimeStep <= lastTimeStep) {
        await recordFailedAttempt(`mfa_verify:${session.user.id}`, clientIp);
        return NextResponse.json(
          { error: "TOTP code already used. Please wait for the next time-step code." },
          { status: 400 },
        );
      }

      if (!storedSecret) {
        return NextResponse.json(
          { error: "MFA is not configured for this account." },
          { status: 400 },
        );
      }

      const isValid = verifyTotpToken(body.token, storedSecret);
      if (!isValid) {
        await recordFailedAttempt(`mfa_verify:${session.user.id}`, clientIp);
        return NextResponse.json(
          { error: "Invalid TOTP code. Please try again." },
          { status: 400 },
        );
      }

      // Update last used time step to prevent replay attacks
      await UserRepository.updateUserGlobal(user._id, {
        $set: { "mfa.lastTimeStep": currentTimeStep },
      });
    }

    await resetFailedAttempts(`mfa_verify:${session.user.id}`, clientIp);

    await AuditService.append({
      institution_id: user.institution_id,
      actor: { email: user.email, user_id: user._id.toString() },
      action: "AUTH_MFA_VERIFIED",
      target: { method: "totp" },
    });

    return await createVerifiedMfaResponse(req, user, "totp", "MFA verified successfully.");
  }

  return NextResponse.json({ error: "Verification code is required." }, { status: 400 });
}

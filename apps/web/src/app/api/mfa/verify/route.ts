import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  AuditService,
  connectDb,
  UserRepository,
  UserModel,
} from "@hostelhub/db";
import { decryptPayload } from "@hostelhub/shared";
import {
  verifyAndConsumeBackupCode,
  verifyTotpToken,
} from "@/lib/auth/mfa";
import {
  isLockedOut,
  recordFailedAttempt,
  resetFailedAttempts,
} from "@/lib/auth/rate-limiter";

export async function POST(req: Request): Promise<NextResponse> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
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
    const pendingSetup = (user as any).mfaPendingSetup;
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

    await UserModel.updateOne(
      { _id: user._id },
      {
        $set: {
          mfa: user.mfa,
        },
        $unset: {
          mfaPendingSetup: "",
        },
      },
    );

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
  if (!user.mfa?.enabled || !user.mfa?.secret) {
    return NextResponse.json(
      { error: "MFA is not configured for this account." },
      { status: 400 },
    );
  }

  let storedSecret: string;
  try {
    const parsedSecretPayload = JSON.parse(user.mfa.secret);
    storedSecret = decryptPayload<string>(parsedSecretPayload, user.institution_id.toString());
  } catch {
    storedSecret = user.mfa.secret;
  }

  // A. Verify Single-Use Backup Code
  if (body.backupCode) {
    const storedHashedCodes = user.mfa.backupCodes ?? [];
    const { valid } = verifyAndConsumeBackupCode(
      body.backupCode,
      storedHashedCodes,
    );

    if (!valid) {
      await recordFailedAttempt(`mfa_verify:${session.user.id}`, clientIp);
      return NextResponse.json(
        { error: "Invalid or already consumed backup code." },
        { status: 400 },
      );
    }

    // Atomic consumption of backup code via $pull
    const candidateHash = (await import("@/lib/auth/mfa")).hashBackupCode(body.backupCode);
    await UserModel.updateOne(
      { _id: user._id },
      { $pull: { "mfa.backupCodes": candidateHash } },
    );

    await resetFailedAttempts(`mfa_verify:${session.user.id}`, clientIp);

    await AuditService.append({
      institution_id: user.institution_id,
      actor: { email: user.email, user_id: user._id.toString() },
      action: "AUTH_MFA_VERIFIED",
      target: { method: "backup_code" },
    });

    return NextResponse.json({
      success: true,
      method: "backup_code",
      message: "Verified with single-use backup code.",
    });
  }

  // B. Verify TOTP Token
  if (body.token) {
    // Prevent TOTP replay: Check time step
    const lastTimeStep = user.mfa.lastTimeStep ?? 0;
    if (currentTimeStep <= lastTimeStep) {
      await recordFailedAttempt(`mfa_verify:${session.user.id}`, clientIp);
      return NextResponse.json(
        { error: "TOTP code already used. Please wait for the next time-step code." },
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
    await UserModel.updateOne(
      { _id: user._id },
      { $set: { "mfa.lastTimeStep": currentTimeStep } },
    );

    await resetFailedAttempts(`mfa_verify:${session.user.id}`, clientIp);

    await AuditService.append({
      institution_id: user.institution_id,
      actor: { email: user.email, user_id: user._id.toString() },
      action: "AUTH_MFA_VERIFIED",
      target: { method: "totp" },
    });

    return NextResponse.json({
      success: true,
      method: "totp",
      message: "MFA verified successfully.",
    });
  }

  return NextResponse.json(
    { error: "Verification code is required." },
    { status: 400 },
  );
}

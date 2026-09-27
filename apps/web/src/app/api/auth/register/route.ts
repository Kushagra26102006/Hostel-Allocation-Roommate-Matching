import { NextResponse } from "next/server";
import { z } from "zod";
import {
  AuditService,
  connectDb,
  InstitutionRepository,
  UserRepository,
  type IUser,
} from "@hostelhub/db";
import { logger } from "@hostelhub/shared";
import { checkPasswordBreached, hashPassword, validatePasswordLength } from "@/lib/auth/password";
import { checkSlidingWindowRateLimit } from "@/lib/auth/rate-limiter";
import { verifyTurnstileToken } from "@/lib/auth/turnstile";

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100).optional(),
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100)
      .optional(),
    email: z.string().trim().email("Please enter a valid campus email address").toLowerCase(),
    password: z.string().min(12, "Password must be at least 12 characters long").max(128),
    confirmPassword: z.string().min(12, "Password confirmation must be at least 12 characters"),
    rollNumber: z.string().trim().max(30).optional(),
    roll_number: z.string().trim().max(30).optional(),
    phone: z.string().trim().max(25).optional(),
    turnstileToken: z.string().optional(),
  })
  .refine((data) => Boolean(data.name || data.fullName), {
    message: "Full name is required",
    path: ["name"],
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export async function POST(req: Request) {
  const correlationId = `reg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const xForwardedFor = req.headers.get("x-forwarded-for");
  const clientIp = xForwardedFor?.split(",")[0]?.trim() ?? "unknown";

  // Rate Limiting: max 5 registration attempts per 10 minutes per IP
  const rateLimit = await checkSlidingWindowRateLimit(`register:${clientIp}`, 5, 600);
  if (!rateLimit.allowed) {
    logger.warn({
      event: "AUTH_REGISTER_RATE_LIMITED",
      correlationId,
      clientIp,
      resetAfterSeconds: rateLimit.resetAfterSeconds,
    });
    return NextResponse.json(
      {
        error: "Too many registration attempts. Please try again in a few minutes.",
        code: "RATE_LIMITED",
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.resetAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request payload.", code: "INVALID_BODY" },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => i.message).join(". ");
    return NextResponse.json(
      { error: errorDetails, code: "VALIDATION_ERROR", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { email, password, turnstileToken } = parsed.data;
  const finalName = (parsed.data.name || parsed.data.fullName)!.trim();
  const finalRollNumber = (parsed.data.rollNumber || parsed.data.roll_number)?.trim();
  const finalPhone = parsed.data.phone?.trim();

  logger.info({
    event: "AUTH_REGISTER_START",
    correlationId,
    email,
    clientIp,
  });

  // 1. Cloudflare Turnstile Verification
  const turnstileResult = await verifyTurnstileToken(turnstileToken, clientIp);
  if (!turnstileResult.success) {
    logger.warn({
      event: "AUTH_TURNSTILE_FAILED",
      correlationId,
      email,
      errorCodes: turnstileResult.errorCodes,
    });
    return NextResponse.json(
      {
        error: "Human verification failed. Please complete the security check and try again.",
        code: "TURNSTILE_FAILED",
      },
      { status: 400 },
    );
  }

  // 2. Validate Password Policy
  const lengthCheck = validatePasswordLength(password);
  if (!lengthCheck.valid) {
    return NextResponse.json(
      { error: lengthCheck.message ?? "Password too short.", code: "PASSWORD_TOO_SHORT" },
      { status: 400 },
    );
  }

  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[\d!@#$%^&*(),.?":{}|<>]/.test(password);
  if (!hasUpper || !hasLower || !hasNumberOrSymbol) {
    return NextResponse.json(
      {
        error:
          "Password must include at least one uppercase letter, one lowercase letter, and one number or special symbol.",
        code: "PASSWORD_WEAK",
      },
      { status: 400 },
    );
  }

  // 3. Breach Check in Production
  if (process.env.NODE_ENV === "production") {
    const breachCheck = await checkPasswordBreached(password);
    if (breachCheck.breached) {
      logger.warn({
        event: "AUTH_PASSWORD_BREACHED",
        correlationId,
        email,
        breachCount: breachCheck.count,
      });
      return NextResponse.json(
        {
          error:
            "This password has been identified in a known public data breach. Please choose a unique, stronger password.",
          code: "PASSWORD_BREACHED",
        },
        { status: 400 },
      );
    }
  }

  try {
    await connectDb();

    // 4. Duplicate Account Check
    const existing = await UserRepository.findByEmailGlobal(email);
    if (existing) {
      logger.warn({
        event: "AUTH_REGISTER_DUPLICATE_EMAIL",
        correlationId,
        email,
      });
      return NextResponse.json(
        {
          error: "An account with this email address already exists. Please sign in instead.",
          code: "EMAIL_EXISTS",
        },
        { status: 409 },
      );
    }

    // 5. Associate with Tenant Institution
    const instRepo = new InstitutionRepository();
    const institutions = await instRepo.findAll();
    const emailDomain = email.split("@")[1];

    let institution = institutions.find(
      (i) => i.status === "active" && emailDomain && i.domain === emailDomain,
    );

    if (!institution) {
      institution =
        institutions.find((i) => i.status === "active" && i.code === "NIT-DEMO") ||
        institutions.find((i) => i.status === "active");
    }

    if (!institution) {
      logger.error({
        event: "AUTH_DATABASE_ERROR",
        correlationId,
        reason: "No active institution configured in system",
      });
      return NextResponse.json(
        {
          error:
            "No active academic institution is available for self-registration. Please contact campus admin.",
          code: "NO_INSTITUTION",
        },
        { status: 500 },
      );
    }

    // 6. Secure Argon2id Password Hashing
    const passwordHash = await hashPassword(password);

    // 7. Role Security: strictly enforce default "student" role (no privilege escalation)
    const userRepo = new UserRepository(institution._id);
    const userPayload: Partial<IUser> = {
      name: finalName,
      email,
      passwordHash,
      roles: ["student"],
      status: "active",
      mfa: {
        enabled: false,
        method: "totp",
        backupCodes: [],
      },
      hostelAssignments: [],
    };
    if (finalRollNumber) userPayload.roll_number = finalRollNumber;
    if (finalPhone) userPayload.phone = finalPhone;

    const newUser = await userRepo.create(userPayload);

    // 8. Audit Logging
    try {
      await AuditService.append({
        institution_id: institution._id,
        actor: { email: newUser.email, user_id: newUser._id.toString(), roles: ["student"] },
        action: "AUTH_REGISTER_SUCCESS",
        target: { email: newUser.email, institutionCode: institution.code },
      });
    } catch {
      // Non-fatal audit logging failure
    }

    logger.info({
      event: "AUTH_REGISTER_SUCCESS",
      correlationId,
      userId: newUser._id.toString(),
      email: newUser.email,
      institutionId: institution._id.toString(),
      rollNumber: newUser.roll_number,
    });

    // Response strictly excludes passwordHash
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully! You can now sign in.",
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          name: newUser.name,
          roles: newUser.roles,
          rollNumber: newUser.roll_number || null,
          phone: newUser.phone || null,
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    // Handle concurrent registration race condition (MongoDB duplicate key error E11000)
    const err = error as { code?: number; message?: string };
    if (err?.code === 11000) {
      logger.warn({
        event: "AUTH_REGISTER_DUPLICATE_RACE",
        correlationId,
        email,
      });
      return NextResponse.json(
        {
          error: "An account with this email address already exists. Please sign in instead.",
          code: "EMAIL_EXISTS",
        },
        { status: 409 },
      );
    }

    logger.error({
      event: "AUTH_DATABASE_ERROR",
      correlationId,
      error: (error as Error).message,
    });

    return NextResponse.json(
      {
        error: "An unexpected error occurred during account creation. Please try again.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}

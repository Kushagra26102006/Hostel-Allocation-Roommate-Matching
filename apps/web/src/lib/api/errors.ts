import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/policy";
import {
  VersionConflictError,
  EntityNotFoundError,
  TenantRequiredError,
  InvalidCursorError,
} from "@hostelhub/db";

export type ProblemCode =
  | "VALIDATION_FAILED"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VERSION_CONFLICT"
  | "IDEMPOTENCY_CONFLICT"
  | "MISSING_IDEMPOTENCY_KEY"
  | "PRECONDITION_FAILED"
  | "RATE_LIMITED"
  | "MALWARE_DETECTED"
  | "BAD_REQUEST"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_SERVER_ERROR";

export interface InvalidParam {
  name: string;
  reason: string;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: ProblemCode;
  requestId: string;
  invalidParams?: InvalidParam[];
  [key: string]: unknown;
}

export interface CreateProblemInput {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: ProblemCode;
  requestId?: string;
  invalidParams?: InvalidParam[];
  [key: string]: unknown;
}

export class ApiProblemError extends Error {
  public readonly problem: ProblemDetails;

  constructor(input: CreateProblemInput) {
    super(input.detail);
    this.name = "ApiProblemError";
    this.problem = {
      type:
        input.type ??
        `https://hostelhub.campus.edu/probs/${input.code.toLowerCase().replace(/_/g, "-")}`,
      title: input.title,
      status: input.status,
      detail: input.detail,
      instance: input.instance ?? "",
      code: input.code,
      requestId: input.requestId ?? "",
      ...(input.invalidParams ? { invalidParams: input.invalidParams } : {}),
    };
    Object.setPrototypeOf(this, ApiProblemError.prototype);
  }
}

export class PreconditionFailedError extends Error {
  constructor(message = "Precondition failed: document ETag version mismatch.") {
    super(message);
    this.name = "PreconditionFailedError";
  }
}

export class RateLimitExceededError extends Error {
  public readonly retryAfterSeconds: number;

  constructor(message = "Rate limit exceeded. Please try again later.", retryAfterSeconds = 60) {
    super(message);
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export class IdempotencyConflictError extends Error {
  constructor(message = "Idempotency key was previously used with a different request payload.") {
    super(message);
    this.name = "IdempotencyConflictError";
  }
}

export class MissingIdempotencyKeyError extends Error {
  constructor(message = "Idempotency-Key header is required for this operation.") {
    super(message);
    this.name = "MissingIdempotencyKeyError";
  }
}

/**
 * Creates an RFC 9457 application/problem+json response.
 */
export function createProblemResponse(
  problem: ProblemDetails,
  extraHeaders: Record<string, string> = {},
): NextResponse {
  return new NextResponse(JSON.stringify(problem), {
    status: problem.status,
    headers: {
      "Content-Type": "application/problem+json",
      "X-Request-Id": problem.requestId,
      ...extraHeaders,
    },
  });
}

/**
 * Transforms any caught error into a compliant RFC 9457 Problem Details response.
 */
export function toProblemResponse(
  error: unknown,
  pathname: string,
  requestId: string,
): NextResponse {
  const instance = pathname;

  if (error instanceof ApiProblemError) {
    return createProblemResponse({
      ...error.problem,
      instance,
      requestId,
    });
  }

  if (error instanceof ZodError) {
    const invalidParams: InvalidParam[] = error.issues.map((issue) => ({
      name: issue.path.join("."),
      reason: issue.message,
    }));

    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/validation-failed",
      title: "Validation Failed",
      status: 422,
      detail: "One or more input fields failed schema validation.",
      instance,
      code: "VALIDATION_FAILED",
      requestId,
      invalidParams,
    });
  }

  if (error instanceof UnauthorizedError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/unauthorized",
      title: "Unauthorized",
      status: 401,
      detail: error.message,
      instance,
      code: "UNAUTHORIZED",
      requestId,
    });
  }

  if (error instanceof ForbiddenError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/forbidden",
      title: "Forbidden",
      status: 403,
      detail: error.message,
      instance,
      code: "FORBIDDEN",
      requestId,
    });
  }

  if (error instanceof EntityNotFoundError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/not-found",
      title: "Not Found",
      status: 404,
      detail: error.message,
      instance,
      code: "NOT_FOUND",
      requestId,
    });
  }

  if (error instanceof VersionConflictError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/version-conflict",
      title: "Version Conflict",
      status: 409,
      detail: error.message,
      instance,
      code: "VERSION_CONFLICT",
      requestId,
      expectedVersion: error.expectedVersion,
      actualVersion: error.actualVersion,
    });
  }

  if (error instanceof TenantRequiredError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/tenant-required",
      title: "Tenant Required",
      status: 401,
      detail: error.message,
      instance,
      code: "UNAUTHORIZED",
      requestId,
    });
  }

  if (error instanceof InvalidCursorError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/invalid-cursor",
      title: "Invalid Cursor",
      status: 400,
      detail: error.message,
      instance,
      code: "BAD_REQUEST",
      requestId,
    });
  }

  // Mongo E11000 Duplicate Key Error => 409 Conflict
  if (
    error &&
    typeof error === "object" &&
    ((error as Record<string, unknown>).code === 11000 ||
      (error as Record<string, unknown>).name === "MongoServerError")
  ) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/conflict",
      title: "Conflict",
      status: 409,
      detail: "Resource already exists or duplicate key constraint violated.",
      instance,
      code: "VERSION_CONFLICT",
      requestId,
    });
  }

  // BSON / CastError => 422 Validation Failed
  if (
    error &&
    typeof error === "object" &&
    ((error as Record<string, unknown>).name === "BSONError" ||
      (error as Record<string, unknown>).name === "CastError")
  ) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/validation-failed",
      title: "Invalid Parameter Format",
      status: 422,
      detail: "Provided ID or parameter format is invalid.",
      instance,
      code: "VALIDATION_FAILED",
      requestId,
    });
  }

  if (error instanceof PreconditionFailedError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/precondition-failed",
      title: "Precondition Failed",
      status: 412,
      detail: error.message,
      instance,
      code: "PRECONDITION_FAILED",
      requestId,
    });
  }

  if (error instanceof IdempotencyConflictError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/idempotency-conflict",
      title: "Idempotency Conflict",
      status: 409,
      detail: error.message,
      instance,
      code: "IDEMPOTENCY_CONFLICT",
      requestId,
    });
  }

  if (error instanceof MissingIdempotencyKeyError) {
    return createProblemResponse({
      type: "https://hostelhub.campus.edu/probs/missing-idempotency-key",
      title: "Missing Idempotency Key",
      status: 400,
      detail: error.message,
      instance,
      code: "MISSING_IDEMPOTENCY_KEY",
      requestId,
    });
  }

  if (error instanceof RateLimitExceededError) {
    return createProblemResponse(
      {
        type: "https://hostelhub.campus.edu/probs/rate-limited",
        title: "Rate Limit Exceeded",
        status: 429,
        detail: error.message,
        instance,
        code: "RATE_LIMITED",
        requestId,
      },
      {
        "Retry-After": String(error.retryAfterSeconds),
      },
    );
  }

  // Generic 500 (Hide error details in production)
  const isProd = process.env.NODE_ENV === "production";
  const detail = isProd
    ? "An unexpected internal server error occurred."
    : error instanceof Error
      ? error.message
      : "Internal server error";

  return createProblemResponse({
    type: "https://hostelhub.campus.edu/probs/internal-server-error",
    title: "Internal Server Error",
    status: 500,
    detail,
    instance,
    code: "INTERNAL_SERVER_ERROR",
    requestId,
  });
}

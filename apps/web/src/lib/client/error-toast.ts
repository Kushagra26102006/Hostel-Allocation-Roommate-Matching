import { toast } from "sonner";
import type { ProblemDetails, ProblemCode } from "../api/errors.js";

const PROBLEM_CODE_MESSAGES: Record<ProblemCode, { title: string; defaultDetail: string }> = {
  VALIDATION_FAILED: {
    title: "Validation Error",
    defaultDetail: "Please check your inputs and try again.",
  },
  UNAUTHORIZED: {
    title: "Authentication Required",
    defaultDetail: "Your session may have expired. Please sign in again.",
  },
  FORBIDDEN: {
    title: "Access Denied",
    defaultDetail: "You do not have permission to perform this action.",
  },
  NOT_FOUND: {
    title: "Resource Not Found",
    defaultDetail: "The requested resource could not be found.",
  },
  VERSION_CONFLICT: {
    title: "Version Conflict",
    defaultDetail: "This record was updated by another user. Please refresh and try again.",
  },
  PRECONDITION_FAILED: {
    title: "Precondition Failed",
    defaultDetail: "The document version did not match the expected state.",
  },
  IDEMPOTENCY_CONFLICT: {
    title: "Idempotency Conflict",
    defaultDetail: "This idempotency key was previously used with different data.",
  },
  MISSING_IDEMPOTENCY_KEY: {
    title: "Missing Key",
    defaultDetail: "An Idempotency-Key is required for this operation.",
  },
  RATE_LIMITED: {
    title: "Rate Limit Exceeded",
    defaultDetail: "Too many requests. Please wait a moment before retrying.",
  },
  BAD_REQUEST: {
    title: "Invalid Request",
    defaultDetail: "The server could not understand the request due to invalid syntax.",
  },
  SERVICE_UNAVAILABLE: {
    title: "Service Unavailable",
    defaultDetail: "The server is temporarily unavailable. Please try again later.",
  },
  INTERNAL_SERVER_ERROR: {
    title: "Server Error",
    defaultDetail: "An unexpected error occurred on the server.",
  },
};

/**
 * Displays a structured error toast mapped from an RFC 9457 Problem Details object.
 */
export function showProblemToast(problem: ProblemDetails): void {
  const meta = PROBLEM_CODE_MESSAGES[problem.code] ?? {
    title: problem.title || "Request Error",
    defaultDetail: problem.detail || "An error occurred.",
  };

  const description =
    problem.invalidParams && problem.invalidParams.length > 0
      ? `${meta.defaultDetail} (${problem.invalidParams.map((p) => p.name).join(", ")})`
      : problem.detail || meta.defaultDetail;

  toast.error(meta.title, {
    description,
    duration: 5000,
  });
}

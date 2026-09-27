export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  instance?: string | undefined;
  invalidParams?: Array<{ name: string; reason: string }> | undefined;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly type: string;
  public readonly invalidParams?: Array<{ name: string; reason: string }> | undefined;

  constructor(options: {
    message: string;
    statusCode?: number | undefined;
    code?: string | undefined;
    type?: string | undefined;
    invalidParams?: Array<{ name: string; reason: string }> | undefined;
  }) {
    super(options.message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode ?? 500;
    this.code = options.code ?? "INTERNAL_SERVER_ERROR";
    this.type =
      options.type ??
      `https://hostelhub.local/errors/${this.code.toLowerCase().replace(/_/g, "-")}`;
    this.invalidParams = options.invalidParams;
    Error.captureStackTrace(this, this.constructor);
  }

  public toProblemDetails(instance?: string): ProblemDetails {
    return {
      type: this.type,
      title: this.name.replace(/Error$/, ""),
      status: this.statusCode,
      code: this.code,
      detail: this.message,
      instance: instance ?? undefined,
      invalidParams: this.invalidParams ?? undefined,
    };
  }
}

export class BadRequestError extends AppError {
  constructor(
    message = "Bad Request",
    code = "BAD_REQUEST",
    invalidParams?: Array<{ name: string; reason: string }>,
  ) {
    super({ message, statusCode: 400, code, invalidParams });
  }
}

export class ValidationError extends AppError {
  constructor(
    message = "Validation failed",
    invalidParams?: Array<{ name: string; reason: string }>,
  ) {
    super({ message, statusCode: 422, code: "VALIDATION_FAILED", invalidParams });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", code = "UNAUTHORIZED") {
    super({ message, statusCode: 401, code });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Access denied", code = "FORBIDDEN") {
    super({ message, statusCode: 403, code });
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code = "NOT_FOUND") {
    super({ message, statusCode: 404, code });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict", code = "CONFLICT") {
    super({ message, statusCode: 409, code });
  }
}

export class VersionConflictError extends AppError {
  constructor(message = "Version conflict (precondition failed)", code = "VERSION_CONFLICT") {
    super({ message, statusCode: 409, code });
  }
}

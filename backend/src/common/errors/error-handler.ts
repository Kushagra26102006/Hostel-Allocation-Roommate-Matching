import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError, type ProblemDetails } from "./app-error.js";
import { logger } from "../../config/logger.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const instance = req.originalUrl || req.url;

  if (err instanceof AppError) {
    const problem = err.toProblemDetails(instance);
    if (err.statusCode >= 500) {
      logger.error({ err, reqId: req.headers["x-request-id"] }, "Server error encountered");
    }
    res.status(err.statusCode).contentType("application/problem+json").json(problem);
    return;
  }

  if (err instanceof ZodError) {
    const invalidParams = err.issues.map((issue) => ({
      name: issue.path.join("."),
      reason: issue.message,
    }));

    const problem: ProblemDetails = {
      type: "https://hostelhub.local/errors/validation-failed",
      title: "Validation Failed",
      status: 422,
      code: "VALIDATION_FAILED",
      detail: "The request body, query, or parameters failed schema validation.",
      instance,
      invalidParams,
    };
    res.status(422).contentType("application/problem+json").json(problem);
    return;
  }

  // Generic unhandled error
  logger.error({ err, reqId: req.headers["x-request-id"] }, "Unhandled exception");
  const problem: ProblemDetails = {
    type: "https://hostelhub.local/errors/internal-server-error",
    title: "Internal Server Error",
    status: 500,
    code: "INTERNAL_SERVER_ERROR",
    detail: process.env.NODE_ENV === "production" ? "An unexpected error occurred." : String(err),
    instance,
  };

  res.status(500).contentType("application/problem+json").json(problem);
};

import { describe, it, expect } from "vitest";
import {
  AppError,
  NotFoundError,
  ForbiddenError,
  ValidationError,
  VersionConflictError,
} from "../../src/common/errors/index.js";

describe("RFC 9457 Problem Details & Errors", () => {
  it("should format NotFoundError correctly", () => {
    const error = new NotFoundError("Room not found", "ROOM_NOT_FOUND");
    const problem = error.toProblemDetails("/api/v1/inventory/rooms/123");

    expect(problem.status).toBe(404);
    expect(problem.code).toBe("ROOM_NOT_FOUND");
    expect(problem.title).toBe("NotFound");
    expect(problem.detail).toBe("Room not found");
    expect(problem.instance).toBe("/api/v1/inventory/rooms/123");
  });

  it("should format ValidationError with invalidParams", () => {
    const invalidParams = [{ name: "email", reason: "Invalid email format" }];
    const error = new ValidationError("Validation failed", invalidParams);
    const problem = error.toProblemDetails("/api/v1/auth/login");

    expect(problem.status).toBe(422);
    expect(problem.code).toBe("VALIDATION_FAILED");
    expect(problem.invalidParams).toHaveLength(1);
    expect(problem.invalidParams?.[0]?.name).toBe("email");
  });

  it("should format VersionConflictError as 409", () => {
    const error = new VersionConflictError("Version mismatch");
    const problem = error.toProblemDetails("/api/v1/drafts/1/override");

    expect(problem.status).toBe(409);
    expect(problem.code).toBe("VERSION_CONFLICT");
  });
});

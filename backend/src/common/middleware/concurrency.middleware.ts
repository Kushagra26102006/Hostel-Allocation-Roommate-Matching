import type { Request, Response, NextFunction } from "express";
import { VersionConflictError } from "../errors/app-error.js";

export function concurrencyGuard(req: Request, _res: Response, next: NextFunction): void {
  // Check for If-Match header on mutation requests
  if (["PUT", "PATCH", "DELETE"].includes(req.method)) {
    const ifMatch = req.headers["if-match"];
    const bodyVersion = req.body && typeof req.body === "object" ? req.body.version : undefined;

    if (ifMatch) {
      const parsed = parseInt(ifMatch.replace(/['"]/g, ""), 10);
      if (!isNaN(parsed)) {
        req.expectedVersion = parsed;
      }
    } else if (bodyVersion !== undefined && typeof bodyVersion === "number") {
      req.expectedVersion = bodyVersion;
    }
  }
  next();
}

declare global {
  namespace Express {
    interface Request {
      expectedVersion?: number | undefined;
    }
  }
}

export function checkVersionConflict(currentVersion: number, expectedVersion?: number): void {
  if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
    throw new VersionConflictError(
      `Precondition Failed: Resource has been modified. Current version is ${currentVersion}, but expected ${expectedVersion}.`,
    );
  }
}

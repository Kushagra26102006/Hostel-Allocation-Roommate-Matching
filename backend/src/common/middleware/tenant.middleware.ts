import type { Request, Response, NextFunction } from "express";
import { BadRequestError } from "../errors/app-error.js";

declare global {
  namespace Express {
    interface Request {
      institutionId?: string | undefined;
    }
  }
}

export function tenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  // Try getting from authenticated user, header, or query
  const headerTenant = req.headers["x-institution-id"] as string | undefined;
  const userTenant = req.user?.institutionId;
  const queryTenant = req.query.institutionId as string | undefined;

  const resolvedTenant =
    userTenant ||
    headerTenant ||
    queryTenant ||
    (process.env.DEFAULT_INSTITUTION_ID ?? "inst-default");

  if (
    !resolvedTenant &&
    !req.path.startsWith("/health") &&
    !req.path.startsWith("/ready") &&
    !req.path.startsWith("/api-docs")
  ) {
    next(
      new BadRequestError("institutionId is required for tenant isolation", "MISSING_TENANT_ID"),
    );
    return;
  }

  req.institutionId = resolvedTenant;
  next();
}

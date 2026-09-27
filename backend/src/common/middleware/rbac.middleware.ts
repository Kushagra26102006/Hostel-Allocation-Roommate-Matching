import type { Request, Response, NextFunction } from "express";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";

export type UserRole =
  "student" | "warden" | "chief_warden" | "hostel_admin" | "dean" | "sys_admin";

export function roleGuard(allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError("Authentication required"));
    }

    const userRole = req.user.role as UserRole;
    if (userRole === "sys_admin" || allowedRoles.includes(userRole)) {
      return next();
    }

    return next(
      new ForbiddenError(
        `Role '${userRole}' is not permitted to access this resource. Allowed: ${allowedRoles.join(", ")}`,
        "INSUFFICIENT_ROLE",
      ),
    );
  };
}

export function assertTenantMatch(req: Request, targetInstitutionId?: string | null): void {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  if (req.user.role === "sys_admin") {
    return;
  }
  if (targetInstitutionId && targetInstitutionId !== req.user.institutionId) {
    throw new ForbiddenError("Cross-tenant operations are forbidden", "TENANT_MISMATCH");
  }
}

export function assertWardenScope(req: Request, targetHostelId?: string | null): void {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  if (["sys_admin", "chief_warden", "hostel_admin"].includes(req.user.role)) {
    return;
  }
  if (req.user.role === "warden") {
    if (
      targetHostelId &&
      req.user.assignedHostelId &&
      req.user.assignedHostelId !== targetHostelId
    ) {
      throw new ForbiddenError(
        "Warden can only access their assigned hostel",
        "WARDEN_HOSTEL_MISMATCH",
      );
    }
  }
}

export function assertStudentOwner(req: Request, targetStudentId: string): void {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  if (["sys_admin", "chief_warden", "hostel_admin", "warden", "dean"].includes(req.user.role)) {
    return;
  }
  if (req.user.role === "student" && req.user.userId !== targetStudentId) {
    throw new ForbiddenError("Students can only access their own records", "STUDENT_NOT_OWNER");
  }
}

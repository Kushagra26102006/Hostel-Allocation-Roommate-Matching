import {
  type Capability,
  type UserRole,
  hasPermission,
} from "@hostelhub/shared";

export class ForbiddenError extends Error {
  public readonly capability?: Capability | undefined;

  constructor(message = "Access denied: insufficient permissions.", capability?: Capability) {
    super(message);
    this.name = "ForbiddenError";
    this.capability = capability;
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required.") {
    super(message);
    this.name = "UnauthorizedError";
    Object.setPrototypeOf(this, UnauthorizedError.prototype);
  }
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  institution_id: string;
  hostelAssignments?: string[];
  mfaPending?: boolean;
}

/**
 * Checks if a user possesses the required capability. Throws ForbiddenError if unauthorized.
 */
export function requirePermission(
  user: SessionUser | null | undefined,
  capability: Capability,
): void {
  if (!user) {
    throw new UnauthorizedError("User is not authenticated.");
  }

  if (!hasPermission(user.roles, capability)) {
    throw new ForbiddenError(
      `User with roles [${user.roles.join(", ")}] lacks required capability: "${capability}".`,
      capability,
    );
  }
}

/**
 * Object-level policy helper: canAccessApplication
 *
 * Rules:
 * - Cross-tenant access is strictly rejected.
 * - student: only if the application belongs to themselves.
 * - warden: if the application is for a hostel assigned to this warden.
 * - chief_warden, hostel_admin, sys_admin, dean: access within own institution.
 */
export function canAccessApplication(
  user: SessionUser,
  application: {
    studentId: string;
    institution_id: string;
    hostelId?: string;
  },
): boolean {
  // Enforce tenant boundary
  if (application.institution_id !== user.institution_id) {
    return false;
  }

  // Student can only access their own application
  if (user.roles.includes("student") && user.roles.length === 1) {
    return application.studentId === user.id;
  }

  // Institutional leadership & operations can access all applications in institution
  if (
    user.roles.some((r) =>
      ["chief_warden", "hostel_admin", "dean", "sys_admin"].includes(r),
    )
  ) {
    return true;
  }

  // Warden: can access if assigned to the target hostel
  if (user.roles.includes("warden")) {
    if (!application.hostelId) {
      // Unassigned applications are visible to wardens for review
      return true;
    }
    const assignments = user.hostelAssignments ?? [];
    return assignments.includes(application.hostelId);
  }

  return false;
}

/**
 * Object-level policy helper: canAccessHostel
 *
 * Rules:
 * - Cross-tenant access rejected if institution_id is provided.
 * - warden: only hostels assigned in user record (user.hostelAssignments).
 * - chief_warden, hostel_admin, dean, sys_admin: all hostels in institution.
 * - student: only if specifically assigned to that hostel.
 */
export function canAccessHostel(
  user: SessionUser,
  hostel:
    | string
    | {
        id: string;
        institution_id: string;
      },
): boolean {
  const hostelId = typeof hostel === "string" ? hostel : hostel.id;

  if (typeof hostel !== "string") {
    if (hostel.institution_id !== user.institution_id) {
      return false;
    }
  }

  // Campus-wide roles have access to all hostels
  if (
    user.roles.some((r) =>
      ["chief_warden", "hostel_admin", "dean", "sys_admin"].includes(r),
    )
  ) {
    return true;
  }

  // Warden is scoped to assigned hostels
  if (user.roles.includes("warden")) {
    const assignments = user.hostelAssignments ?? [];
    return assignments.includes(hostelId);
  }

  // Student is scoped to assigned hostel
  if (user.roles.includes("student")) {
    const assignments = user.hostelAssignments ?? [];
    return assignments.includes(hostelId);
  }

  return false;
}

/**
 * Object-level policy helper: canReviewDraft
 *
 * Rules:
 * - Cross-tenant access rejected.
 * - dean: read-only review of drafts.
 * - chief_warden: campus-wide draft review.
 * - sys_admin: governance draft review.
 * - warden: review draft for own assigned hostels.
 * - student & hostel_admin: cannot review drafts.
 */
export function canReviewDraft(
  user: SessionUser,
  draft: {
    hostelId?: string;
    institution_id: string;
  },
): boolean {
  if (draft.institution_id !== user.institution_id) {
    return false;
  }

  if (user.roles.some((r) => ["dean", "chief_warden", "sys_admin"].includes(r))) {
    return true;
  }

  if (user.roles.includes("warden")) {
    if (!draft.hostelId) return true;
    const assignments = user.hostelAssignments ?? [];
    return assignments.includes(draft.hostelId);
  }

  return false;
}

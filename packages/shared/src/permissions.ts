/**
 * @hostelhub/shared
 * Role-Based Access Control (RBAC) Permissions Matrix
 *
 * Mappings:
 * - student: own application/preferences/questionnaire/result, room-change and appeal
 * - warden: own-hostel review, override, approve, publish, waitlist, decisions
 * - chief_warden: all hostels, plus escalated approvals
 * - hostel_admin: inventory, cycles, policy rules, run allocation, document verification
 * - dean: read-only analytics, audit and drafts
 * - sys_admin: weights, users, roles, feature flags, API keys, webhooks, audit
 */

export type UserRole =
  | "student"
  | "warden"
  | "chief_warden"
  | "hostel_admin"
  | "dean"
  | "sys_admin";

export type Capability =
  // Student capabilities
  | "application:own"
  | "preferences:own"
  | "questionnaire:own"
  | "result:own"
  | "room_change:request"
  | "appeal:submit"
  // Warden capabilities
  | "hostel:review_own"
  | "allocation:override_own"
  | "allocation:approve_own"
  | "allocation:publish_own"
  | "waitlist:manage_own"
  | "decisions:manage_own"
  // Chief Warden additional capabilities
  | "hostel:review_all"
  | "allocation:escalated_approval"
  | "allocation:run"
  | "appeals:decide"
  // Hostel Admin capabilities
  | "inventory:manage"
  | "cycles:manage"
  | "policy:rules"
  | "document:verify"
  // Dean capabilities
  | "analytics:read"
  | "audit:read"
  | "drafts:read"
  // Sys Admin capabilities
  | "weights:configure"
  | "users:manage"
  | "roles:manage"
  | "feature_flags:manage"
  | "api_keys:manage"
  | "webhooks:manage";

const STUDENT_CAPABILITIES: readonly Capability[] = [
  "application:own",
  "preferences:own",
  "questionnaire:own",
  "result:own",
  "room_change:request",
  "appeal:submit",
] as const;

const WARDEN_CAPABILITIES: readonly Capability[] = [
  "hostel:review_own",
  "allocation:override_own",
  "allocation:approve_own",
  "allocation:publish_own",
  "waitlist:manage_own",
  "decisions:manage_own",
] as const;

const CHIEF_WARDEN_CAPABILITIES: readonly Capability[] = [
  ...WARDEN_CAPABILITIES,
  "hostel:review_all",
  "allocation:escalated_approval",
  "allocation:run",
  "appeals:decide",
] as const;

const HOSTEL_ADMIN_CAPABILITIES: readonly Capability[] = [
  "inventory:manage",
  "cycles:manage",
  "policy:rules",
  "allocation:run",
  "document:verify",
] as const;

const DEAN_CAPABILITIES: readonly Capability[] = [
  "analytics:read",
  "audit:read",
  "drafts:read",
] as const;

const SYS_ADMIN_CAPABILITIES: readonly Capability[] = [
  "weights:configure",
  "users:manage",
  "roles:manage",
  "feature_flags:manage",
  "api_keys:manage",
  "webhooks:manage",
  "audit:read",
] as const;

export const ROLE_PERMISSIONS: Record<UserRole, readonly Capability[]> = {
  student: STUDENT_CAPABILITIES,
  warden: WARDEN_CAPABILITIES,
  chief_warden: CHIEF_WARDEN_CAPABILITIES,
  hostel_admin: HOSTEL_ADMIN_CAPABILITIES,
  dean: DEAN_CAPABILITIES,
  sys_admin: SYS_ADMIN_CAPABILITIES,
};

/**
 * Returns all capabilities granted to a specific role.
 */
export function getRoleCapabilities(role: UserRole): readonly Capability[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Checks if a single role or an array of roles has the specified capability.
 */
export function hasPermission(
  roles: UserRole | readonly UserRole[],
  capability: Capability,
): boolean {
  const roleList: readonly UserRole[] = Array.isArray(roles)
    ? roles
    : [roles];
  return roleList.some((r) => {
    const caps = ROLE_PERMISSIONS[r];
    return caps ? caps.includes(capability) : false;
  });
}

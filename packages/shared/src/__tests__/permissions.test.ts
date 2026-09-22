import { describe, it, expect } from "vitest";
import {
  type Capability,
  type UserRole,
  getRoleCapabilities,
  hasPermission,
  ROLE_PERMISSIONS,
} from "../permissions.js";

describe("Permissions Matrix (Table-driven Authorization)", () => {
  const allRoles: UserRole[] = [
    "student",
    "warden",
    "chief_warden",
    "hostel_admin",
    "dean",
    "sys_admin",
  ];

  const allCapabilities: Capability[] = [
    "application:own",
    "preferences:own",
    "questionnaire:own",
    "result:own",
    "room_change:request",
    "appeal:submit",
    "hostel:review_own",
    "allocation:override_own",
    "allocation:approve_own",
    "allocation:publish_own",
    "waitlist:manage_own",
    "decisions:manage_own",
    "hostel:review_all",
    "allocation:escalated_approval",
    "allocation:run",
    "appeals:decide",
    "inventory:manage",
    "cycles:manage",
    "policy:rules",
    "document:verify",
    "checkin:manage",
    "checkin:acknowledge",
    "payment:own",
    "payment:manage",
    "payment:read",
    "analytics:read",
    "audit:read",
    "drafts:read",
    "weights:configure",
    "users:manage",
    "roles:manage",
    "feature_flags:manage",
    "api_keys:manage",
    "webhooks:manage",
  ];

  it("each role maps to its exact required capabilities", () => {
    // 1. Student capabilities
    expect(ROLE_PERMISSIONS.student).toEqual([
      "application:own",
      "preferences:own",
      "questionnaire:own",
      "result:own",
      "room_change:request",
      "appeal:submit",
      "checkin:acknowledge",
      "payment:own",
    ]);

    // 2. Warden capabilities
    expect(ROLE_PERMISSIONS.warden).toEqual([
      "hostel:review_own",
      "allocation:override_own",
      "allocation:approve_own",
      "allocation:publish_own",
      "waitlist:manage_own",
      "decisions:manage_own",
      "checkin:manage",
      "payment:manage",
    ]);

    // 3. Chief Warden has all warden capabilities + escalated approvals
    expect(ROLE_PERMISSIONS.chief_warden).toContain("hostel:review_own");
    expect(ROLE_PERMISSIONS.chief_warden).toContain("allocation:escalated_approval");
    expect(ROLE_PERMISSIONS.chief_warden).toContain("allocation:run");
    expect(ROLE_PERMISSIONS.chief_warden).toContain("appeals:decide");

    // 4. Hostel Admin
    expect(ROLE_PERMISSIONS.hostel_admin).toEqual([
      "inventory:manage",
      "cycles:manage",
      "policy:rules",
      "allocation:run",
      "document:verify",
      "checkin:manage",
      "payment:manage",
    ]);

    // 5. Dean has read-only analytics, audit and drafts
    expect(ROLE_PERMISSIONS.dean).toEqual([
      "analytics:read",
      "audit:read",
      "drafts:read",
      "payment:read",
    ]);

    // 6. Sys Admin
    expect(ROLE_PERMISSIONS.sys_admin).toEqual([
      "weights:configure",
      "users:manage",
      "roles:manage",
      "feature_flags:manage",
      "api_keys:manage",
      "webhooks:manage",
      "audit:read",
      "checkin:manage",
      "payment:manage",
    ]);
  });

  // Table-driven verification across all 6 roles x all 29 capabilities
  describe.each(allRoles)("Role: %s", (role) => {
    const roleCaps = getRoleCapabilities(role);

    it.each(allCapabilities)("evaluates capability '%s'", (capability) => {
      const isExpected = roleCaps.includes(capability);
      const actual = hasPermission(role, capability);
      expect(actual).toBe(isExpected);
    });
  });

  it("handles multi-role users correctly with union of capabilities", () => {
    const multiRoles: UserRole[] = ["student", "warden"];
    expect(hasPermission(multiRoles, "application:own")).toBe(true);
    expect(hasPermission(multiRoles, "hostel:review_own")).toBe(true);
    expect(hasPermission(multiRoles, "weights:configure")).toBe(false);
  });
});

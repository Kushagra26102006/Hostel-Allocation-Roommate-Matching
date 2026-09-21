import { describe, it, expect, vi } from "vitest";
import {
  isReadOnlyRole,
  assertNotReadOnly,
  requirePermission,
  ForbiddenError,
  type SessionUser,
} from "../lib/auth/policy.js";
import { hasPermission, type Capability, type UserRole } from "@hostelhub/shared";
import { POST as refreshRoute } from "../app/api/v1/reports/refresh/route.js";

describe("Prompt 25: Dean Strictly Read-Only Policy Tests", () => {
  const deanUser: SessionUser = {
    id: "dean_user_1",
    email: "dean@nit.edu",
    name: "Dean of Student Welfare",
    roles: ["dean"],
    institution_id: "inst_nit_1",
  };

  const chiefWardenUser: SessionUser = {
    id: "chief_1",
    email: "chief@nit.edu",
    name: "Chief Warden",
    roles: ["chief_warden"],
    institution_id: "inst_nit_1",
  };

  const adminUser: SessionUser = {
    id: "admin_1",
    email: "admin@nit.edu",
    name: "Hostel Admin",
    roles: ["hostel_admin"],
    institution_id: "inst_nit_1",
  };

  describe("1. isReadOnlyRole check", () => {
    it("identifies Dean as strictly read-only", () => {
      expect(isReadOnlyRole("dean")).toBe(true);
    });

    it("identifies other roles as write-capable", () => {
      const otherRoles: UserRole[] = [
        "student",
        "warden",
        "chief_warden",
        "hostel_admin",
        "sys_admin",
      ];
      for (const role of otherRoles) {
        expect(isReadOnlyRole(role)).toBe(false);
      }
    });
  });

  describe("2. assertNotReadOnly enforcement", () => {
    it("throws ForbiddenError when user has only Dean role", () => {
      expect(() => assertNotReadOnly(deanUser)).toThrow(ForbiddenError);
      expect(() => assertNotReadOnly(deanUser)).toThrow(/strictly read-only/i);
    });

    it("allows execution for write-capable roles", () => {
      expect(() => assertNotReadOnly(chiefWardenUser)).not.toThrow();
      expect(() => assertNotReadOnly(adminUser)).not.toThrow();
    });
  });

  describe("3. RBAC Capabilities Matrix - Dean cannot write anything", () => {
    const mutatingCapabilities: Capability[] = [
      "allocation:override_own",
      "allocation:approve_own",
      "allocation:publish_own",
      "allocation:run",
      "allocation:escalated_approval",
      "waitlist:manage_own",
      "decisions:manage_own",
      "appeals:decide",
      "inventory:manage",
      "cycles:manage",
      "policy:rules",
      "document:verify",
      "weights:configure",
      "users:manage",
      "roles:manage",
    ];

    it("verifies Dean has 0 write capabilities in the permissions matrix", () => {
      for (const cap of mutatingCapabilities) {
        expect(hasPermission(["dean"], cap)).toBe(false);
        expect(() => requirePermission(deanUser, cap)).toThrow(ForbiddenError);
      }
    });

    it("verifies Dean HAS read permissions for analytics, drafts, and audits", () => {
      expect(hasPermission(["dean"], "analytics:read")).toBe(true);
      expect(hasPermission(["dean"], "audit:read")).toBe(true);
      expect(hasPermission(["dean"], "drafts:read")).toBe(true);

      expect(() => requirePermission(deanUser, "analytics:read")).not.toThrow();
    });
  });

  describe("4. Mutation API Endpoint Rejection for Dean", () => {
    it("strictly blocks Dean from triggering write/refresh endpoints (403 Forbidden)", async () => {
      // Mock auth returning Dean session
      vi.doMock("@/auth", () => ({
        auth: vi.fn().mockResolvedValue({
          user: {
            id: deanUser.id,
            email: deanUser.email,
            name: deanUser.name,
            roles: ["dean"],
            institution_id: deanUser.institution_id,
          },
        }),
      }));

      const req = new Request("http://localhost:3000/api/v1/reports/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-institution-id": deanUser.institution_id,
        },
        body: JSON.stringify({ cycleId: "cycle_123" }),
      });

      const res = await refreshRoute(req);
      // apiHandler transforms ForbiddenError to 403 Problem response
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.title).toMatch(/Forbidden|denied/i);
    });
  });
});

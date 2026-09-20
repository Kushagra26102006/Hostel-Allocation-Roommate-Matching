import { describe, it, expect } from "vitest";
import {
  requirePermission,
  canAccessApplication,
  canAccessHostel,
  canReviewDraft,
  ForbiddenError,
  UnauthorizedError,
  type SessionUser,
} from "../lib/auth/policy.js";

describe("Authorisation Policies & Cross-Tenant Isolation", () => {
  const institutionA = "inst_alpha_123";
  const institutionB = "inst_beta_456";

  const studentA: SessionUser = {
    id: "student_1",
    email: "student1@nit.edu",
    name: "Student One",
    roles: ["student"],
    institution_id: institutionA,
  };

  const studentB: SessionUser = {
    id: "student_2",
    email: "student2@other.edu",
    name: "Student Two",
    roles: ["student"],
    institution_id: institutionB,
  };

  const wardenA: SessionUser = {
    id: "warden_1",
    email: "warden@nit.edu",
    name: "Warden One",
    roles: ["warden"],
    institution_id: institutionA,
    hostelAssignments: ["BH-1", "BH-2"],
  };

  const chiefWardenA: SessionUser = {
    id: "chief_1",
    email: "chief@nit.edu",
    name: "Chief Warden",
    roles: ["chief_warden"],
    institution_id: institutionA,
  };

  const deanA: SessionUser = {
    id: "dean_1",
    email: "dean@nit.edu",
    name: "Dean Welfare",
    roles: ["dean"],
    institution_id: institutionA,
  };

  const hostelAdminA: SessionUser = {
    id: "admin_1",
    email: "admin@nit.edu",
    name: "Hostel Admin",
    roles: ["hostel_admin"],
    institution_id: institutionA,
  };

  describe("requirePermission Wrapper", () => {
    it("allows execution when user has capability", () => {
      expect(() =>
        requirePermission(studentA, "application:own"),
      ).not.toThrow();

      expect(() =>
        requirePermission(wardenA, "allocation:override_own"),
      ).not.toThrow();

      expect(() =>
        requirePermission(chiefWardenA, "allocation:escalated_approval"),
      ).not.toThrow();
    });

    it("throws ForbiddenError when user lacks capability", () => {
      expect(() =>
        requirePermission(studentA, "weights:configure"),
      ).toThrow(ForbiddenError);

      expect(() =>
        requirePermission(wardenA, "weights:configure"),
      ).toThrow(ForbiddenError);
    });

    it("throws UnauthorizedError when user is null or undefined", () => {
      expect(() => requirePermission(null, "application:own")).toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("canAccessApplication", () => {
    it("strictly rejects cross-tenant access", () => {
      const appTenantB = {
        studentId: studentB.id,
        institution_id: institutionB,
      };

      // Tenant A staff cannot access Tenant B application
      expect(canAccessApplication(wardenA, appTenantB)).toBe(false);
      expect(canAccessApplication(chiefWardenA, appTenantB)).toBe(false);
      expect(canAccessApplication(deanA, appTenantB)).toBe(false);
      expect(canAccessApplication(studentA, appTenantB)).toBe(false);
    });

    it("allows student to access only their own application", () => {
      const ownApp = {
        studentId: studentA.id,
        institution_id: institutionA,
      };
      const otherApp = {
        studentId: "other_student_id",
        institution_id: institutionA,
      };

      expect(canAccessApplication(studentA, ownApp)).toBe(true);
      expect(canAccessApplication(studentA, otherApp)).toBe(false);
    });

    it("allows warden to access applications for assigned hostels", () => {
      const assignedApp = {
        studentId: "any_student",
        institution_id: institutionA,
        hostelId: "BH-1",
      };
      const unassignedApp = {
        studentId: "any_student",
        institution_id: institutionA,
        hostelId: "GH-3",
      };

      expect(canAccessApplication(wardenA, assignedApp)).toBe(true);
      expect(canAccessApplication(wardenA, unassignedApp)).toBe(false);
    });

    it("allows campus leadership access within the same institution", () => {
      const app = {
        studentId: "any_student",
        institution_id: institutionA,
        hostelId: "GH-3",
      };

      expect(canAccessApplication(chiefWardenA, app)).toBe(true);
      expect(canAccessApplication(hostelAdminA, app)).toBe(true);
      expect(canAccessApplication(deanA, app)).toBe(true);
    });
  });

  describe("canAccessHostel", () => {
    it("strictly rejects cross-tenant hostel access", () => {
      const hostelTenantB = { id: "BH-1", institution_id: institutionB };
      expect(canAccessHostel(wardenA, hostelTenantB)).toBe(false);
      expect(canAccessHostel(chiefWardenA, hostelTenantB)).toBe(false);
    });

    it("restricts wardens to their assigned hostels", () => {
      expect(canAccessHostel(wardenA, "BH-1")).toBe(true);
      expect(canAccessHostel(wardenA, "BH-2")).toBe(true);
      expect(canAccessHostel(wardenA, "GH-1")).toBe(false);
    });

    it("allows institutional roles access to all campus hostels", () => {
      expect(canAccessHostel(chiefWardenA, "GH-1")).toBe(true);
      expect(canAccessHostel(hostelAdminA, "GH-1")).toBe(true);
      expect(canAccessHostel(deanA, "GH-1")).toBe(true);
    });
  });

  describe("canReviewDraft", () => {
    it("strictly rejects cross-tenant draft reviews", () => {
      const draftTenantB = { hostelId: "BH-1", institution_id: institutionB };
      expect(canReviewDraft(deanA, draftTenantB)).toBe(false);
      expect(canReviewDraft(chiefWardenA, draftTenantB)).toBe(false);
    });

    it("allows dean and chief warden to review drafts", () => {
      const draft = { hostelId: "BH-1", institution_id: institutionA };
      expect(canReviewDraft(deanA, draft)).toBe(true);
      expect(canReviewDraft(chiefWardenA, draft)).toBe(true);
    });

    it("allows warden to review draft only for assigned hostels", () => {
      const assignedDraft = { hostelId: "BH-1", institution_id: institutionA };
      const unassignedDraft = { hostelId: "GH-1", institution_id: institutionA };

      expect(canReviewDraft(wardenA, assignedDraft)).toBe(true);
      expect(canReviewDraft(wardenA, unassignedDraft)).toBe(false);
    });

    it("rejects draft reviews from students and hostel admins", () => {
      const draft = { hostelId: "BH-1", institution_id: institutionA };
      expect(canReviewDraft(studentA, draft)).toBe(false);
      expect(canReviewDraft(hostelAdminA, draft)).toBe(false);
    });
  });
});

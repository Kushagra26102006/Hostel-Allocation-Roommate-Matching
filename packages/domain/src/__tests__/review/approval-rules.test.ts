import { describe, it, expect } from "vitest";
import { evaluateApprovalRequirements } from "../../review/approval-rules.js";

describe("Approval Rules & Maker-Checker", () => {
  const warden1 = {
    userId: "u_warden_1",
    name: "Dr. Sharma",
    email: "warden1@nit.edu",
    role: "warden" as const,
  };

  const warden2 = {
    userId: "u_warden_2",
    name: "Dr. Verma",
    email: "warden2@nit.edu",
    role: "chief_warden" as const,
  };

  it("approves draft without overrides when status is UNDER_REVIEW", () => {
    const res = evaluateApprovalRequirements({
      draftState: "UNDER_REVIEW",
      overrides: [],
      hasInvariantErrors: false,
      approver: warden1,
    });

    expect(res.allowed).toBe(true);
    expect(res.requiresSecondApprover).toBe(false);
  });

  it("rejects approval if draft is not in UNDER_REVIEW status", () => {
    const res = evaluateApprovalRequirements({
      draftState: "DRAFT_READY",
      overrides: [],
      hasInvariantErrors: false,
      approver: warden1,
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe("INVALID_STATE");
  });

  it("rejects approval if any override lacks a valid reason", () => {
    const res = evaluateApprovalRequirements({
      draftState: "UNDER_REVIEW",
      overrides: [
        {
          overrideId: "ov_1",
          studentId: "stu_1",
          reason: "short",
          escalated: false,
        },
      ],
      hasInvariantErrors: false,
      approver: warden1,
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe("OVERRIDE_MISSING_REASON");
  });

  it("mandates second approver (Maker-Checker) when escalated override exists", () => {
    const res = evaluateApprovalRequirements({
      draftState: "UNDER_REVIEW",
      overrides: [
        {
          overrideId: "ov_1",
          studentId: "stu_1",
          reason: "Medical accessibility requirement relocation.",
          escalated: true,
        },
      ],
      hasInvariantErrors: false,
      approver: warden1,
    });

    expect(res.allowed).toBe(false);
    expect(res.requiresSecondApprover).toBe(true);
    expect(res.code).toBe("MISSING_SECOND_APPROVER");
  });

  it("rejects duplicate approver when maker and checker are identical user", () => {
    const res = evaluateApprovalRequirements({
      draftState: "UNDER_REVIEW",
      overrides: [
        {
          overrideId: "ov_1",
          studentId: "stu_1",
          reason: "Quota-based accommodation realignment.",
          escalated: true,
        },
      ],
      hasInvariantErrors: false,
      approver: warden1,
      secondApprover: warden1, // same user
    });

    expect(res.allowed).toBe(false);
    expect(res.code).toBe("DUPLICATE_APPROVER");
  });

  it("approves escalated draft when two distinct approvers are provided", () => {
    const res = evaluateApprovalRequirements({
      draftState: "UNDER_REVIEW",
      overrides: [
        {
          overrideId: "ov_1",
          studentId: "stu_1",
          reason: "Medical accessibility requirement relocation.",
          escalated: true,
        },
      ],
      hasInvariantErrors: false,
      approver: warden1,
      secondApprover: warden2,
    });

    expect(res.allowed).toBe(true);
    expect(res.requiresSecondApprover).toBe(true);
  });
});

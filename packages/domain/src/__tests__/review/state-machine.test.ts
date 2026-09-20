import { describe, it, expect } from "vitest";
import {
  canTransition,
  transitionDraftState,
  InvalidStateTransitionError,
} from "../../review/state-machine.js";

describe("Draft State Machine", () => {
  it("allows standard forward progression: GENERATING -> DRAFT_READY -> UNDER_REVIEW -> APPROVED -> PUBLISHED", () => {
    expect(canTransition("GENERATING", "DRAFT_READY", "system").allowed).toBe(true);
    expect(canTransition("DRAFT_READY", "UNDER_REVIEW", "hostel_admin").allowed).toBe(true);
    expect(canTransition("UNDER_REVIEW", "APPROVED", "warden").allowed).toBe(true);
    expect(
      canTransition("APPROVED", "PUBLISHED", "warden", {
        approvalRecordId: "rec_123",
      }).allowed,
    ).toBe(true);
  });

  it("blocks transition from GENERATING to PUBLISHED directly", () => {
    const result = canTransition("GENERATING", "PUBLISHED", "chief_warden");
    expect(result.allowed).toBe(false);
    expect(() => transitionDraftState("GENERATING", "PUBLISHED", "chief_warden")).toThrow(
      InvalidStateTransitionError,
    );
  });

  it("blocks publish if approvalRecordId is missing in context", () => {
    const result = canTransition("APPROVED", "PUBLISHED", "chief_warden", {});
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("cannot publish draft without a valid approval record");
  });

  it("enforces role permissions: student cannot transition drafts", () => {
    // @ts-expect-error test unauthorized role
    const result = canTransition("UNDER_REVIEW", "APPROVED", "student");
    expect(result.allowed).toBe(false);
  });

  it("allows changes requested with valid comment, rejects with short or empty comment", () => {
    expect(
      canTransition("UNDER_REVIEW", "CHANGES_REQUESTED", "warden", {
        comment: "Please reassign Room 304 because of plumbing issue.",
      }).allowed,
    ).toBe(true);

    const shortComment = canTransition("UNDER_REVIEW", "CHANGES_REQUESTED", "warden", {
      comment: "fix this",
    });
    expect(shortComment.allowed).toBe(false);
    expect(shortComment.reason).toContain("at least 10 characters");
  });

  it("allows return from CHANGES_REQUESTED to UNDER_REVIEW", () => {
    expect(canTransition("CHANGES_REQUESTED", "UNDER_REVIEW", "hostel_admin").allowed).toBe(true);
  });

  it("supports amendment path: PUBLISHED -> AMENDED -> ARCHIVED", () => {
    expect(canTransition("PUBLISHED", "AMENDED", "chief_warden").allowed).toBe(true);
    expect(canTransition("AMENDED", "ARCHIVED", "system").allowed).toBe(true);
  });
});

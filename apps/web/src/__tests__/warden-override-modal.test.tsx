import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import { OverrideModal } from "../components/warden/override-modal";
import type { OverrideTargetInfo } from "../components/warden/override-modal";

const mockTarget: OverrideTargetInfo = {
  assignmentId: "asgn-001",
  studentName: "Priya Patel",
  rollNumber: "ME2026-108",
  fromBedNo: "A",
  fromRoomNumber: "101",
  toBedId: "bed-202b",
  toBedNo: "B",
  toRoomNumber: "202",
  toRoomAccessible: false,
  toBedAccessible: false,
};

const escalatedTarget: OverrideTargetInfo = {
  ...mockTarget,
  escalated: true,
  escalationReasons: ["Target bed has certified accessibility flag"],
};

describe("OverrideModal Component", () => {
  it("renders dialog with student details and bed transfer target", () => {
    render(
      <OverrideModal
        open={true}
        onOpenChange={vi.fn()}
        draftId="draft-123"
        draftVersion={1}
        targetInfo={mockTarget}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText(/Manual Bed Reassignment/i)).toBeDefined();
    expect(screen.getByText(/Priya Patel/i)).toBeDefined();
    expect(screen.getByText(/Room\s*101\s*•\s*Bed\s*A/i)).toBeDefined();
    expect(screen.getByText(/Room\s*202\s*•\s*Bed\s*B/i)).toBeDefined();
  });

  it("enforces mandatory reason >= 10 characters before submit is enabled", () => {
    render(
      <OverrideModal
        open={true}
        onOpenChange={vi.fn()}
        draftId="draft-123"
        draftVersion={1}
        targetInfo={mockTarget}
        onSuccess={vi.fn()}
      />,
    );

    const submitBtn = screen.getByRole("button", { name: /Confirm & Bump Version/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    const textarea = screen.getByPlaceholderText(
      /Document legitimate administrative, medical, or discipline justification/i,
    );
    fireEvent.change(textarea, { target: { value: "Short" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    fireEvent.change(textarea, {
      target: { value: "Approved by Hostel Dean due to valid medical accommodation request." },
    });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);
  });

  it("displays Maker-Checker escalation warning banner when escalated flag is true", () => {
    render(
      <OverrideModal
        open={true}
        onOpenChange={vi.fn()}
        draftId="draft-123"
        draftVersion={1}
        targetInfo={escalatedTarget}
        onSuccess={vi.fn()}
      />,
    );

    expect(screen.getByText(/Escalated Override \(Maker-Checker Trigger\)/i)).toBeDefined();
    expect(
      screen.getByText(
        /Approving this draft will require a distinct second approver before publication/i,
      ),
    ).toBeDefined();
  });
});

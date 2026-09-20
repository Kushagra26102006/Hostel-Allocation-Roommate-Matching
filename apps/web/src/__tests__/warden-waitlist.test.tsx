import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import * as React from "react";
import {
  WaitlistTable,
  type WaitlistEntryItem,
} from "../components/warden/waitlist/waitlist-table";
import { ReorderModal, type ReorderTarget } from "../components/warden/waitlist/reorder-modal";
import {
  ProposalsBanner,
  type PromotionProposalItem,
} from "../components/warden/waitlist/proposals-banner";

const mockEntries: WaitlistEntryItem[] = [
  {
    id: "w-1",
    draft_id: "draft-1",
    application_id: "app-1",
    student_id: "s-1",
    student_name: "Aman Gupta",
    student_email: "aman@hostelhub.internal",
    reference_number: "APP-2026-001",
    gender: "male",
    programme: "Computer Science",
    year: 1,
    accessibility_need: true,
    position: 1,
    priority_score: 95,
    quota_bucket: "General",
    status: "waiting",
    waiting_reason_code: "ACCESSIBLE_ROOM_CAPACITY_REACHED",
  },
  {
    id: "w-2",
    draft_id: "draft-1",
    application_id: "app-2",
    student_id: "s-2",
    student_name: "Rohan Verma",
    student_email: "rohan@hostelhub.internal",
    reference_number: "APP-2026-002",
    gender: "male",
    programme: "Mechanical",
    year: 1,
    accessibility_need: false,
    position: 2,
    priority_score: 88,
    quota_bucket: "OBC",
    status: "waiting",
    waiting_reason_code: "QUOTA_EXHAUSTED",
  },
];

describe("Warden Waitlist Components", () => {
  it("WaitlistTable renders position badges, student name, and reason codes", () => {
    render(
      <WaitlistTable entries={mockEntries} onOpenReorder={vi.fn()} onOpenManualPromote={vi.fn()} />,
    );

    expect(screen.getByText("#1")).toBeDefined();
    expect(screen.getByText("#2")).toBeDefined();
    expect(screen.getByText("Aman Gupta")).toBeDefined();
    expect(screen.getByText("Rohan Verma")).toBeDefined();
    expect(screen.getByText(/Accessible Bed Required/i)).toBeDefined();
    expect(screen.getByText(/Quota Exhausted/i)).toBeDefined();
  });

  it("ReorderModal enforces mandatory reason >= 10 characters", () => {
    const target: ReorderTarget = {
      id: "w-2",
      studentName: "Rohan Verma",
      currentPosition: 2,
      maxPosition: 2,
    };

    render(<ReorderModal isOpen={true} onClose={vi.fn()} target={target} onConfirm={vi.fn()} />);

    expect(screen.getByText(/Reorder Queue Position/i)).toBeDefined();
    expect(screen.getByText(/Rohan Verma/i)).toBeDefined();

    const submitBtn = screen.getByRole("button", { name: /Update Priority/i });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    const textarea = screen.getByPlaceholderText(/e\.g\. Dean welfare/i);

    // Enter short reason (< 10 chars)
    fireEvent.change(textarea, { target: { value: "Short" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(true);

    // Enter valid reason (>= 10 chars)
    fireEvent.change(textarea, { target: { value: "Compassionate ground reordering" } });
    expect(submitBtn.hasAttribute("disabled")).toBe(false);
  });

  it("ProposalsBanner renders pending proposals with confirm and reject options", () => {
    const proposals: PromotionProposalItem[] = [
      {
        id: "prop-1",
        draft_id: "draft-1",
        waitlist_entry_id: "w-1",
        student_id: "s-1",
        student_name: "Sneha Roy",
        student_email: "sneha@hostelhub.internal",
        reference_number: "APP-2026-099",
        bed_id: "bed-101a",
        bed_no: "A",
        room_id: "room-101",
        room_number: "101",
        hostel_id: "hostel-1",
        hostel_name: "Gargi Bhawan",
        trigger: "withdrawal",
        status: "pending",
        created_at: new Date().toISOString(),
      },
    ];

    const onConfirm = vi.fn();
    const onReject = vi.fn();

    render(<ProposalsBanner proposals={proposals} onConfirm={onConfirm} onReject={onReject} />);

    expect(screen.getByText(/Warden Gate: 1 Pending Promotion Proposal/i)).toBeDefined();
    expect(screen.getByText("Sneha Roy")).toBeDefined();
    expect(screen.getByText(/Room 101, Bed A/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /Confirm Promotion/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Reject/i })).toBeDefined();
  });
});

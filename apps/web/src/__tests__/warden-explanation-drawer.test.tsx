import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import * as React from "react";
import { ExplanationDrawer } from "../components/warden/explanation-drawer";
import type { EnrichedAssignment } from "../components/warden/explanation-drawer";

const mockAssignment: EnrichedAssignment = {
  id: "asgn-123",
  student: {
    id: "stud-1",
    name: "Arjun Sharma",
    email: "arjun@example.com",
    rollNumber: "CS2026-042",
    gender: "male",
    programme: "BTech Computer Science",
    year: 2,
    quota: "General",
    accessibilityNeed: true,
  },
  bed: {
    id: "bed-101a",
    bedNo: "A",
    accessible: true,
    status: "assigned",
  },
  room: {
    id: "room-101",
    roomNumber: "101",
    roomType: "Double",
    capacity: 2,
    accessible: true,
    floor: 1,
    block: "Block A",
  },
  hostel: {
    id: "hostel-1",
    name: "Kaveri Hostel",
  },
  score: 88.5,
  explanation: "Algorithmic placement verified",
  friendlySentence:
    "Arjun Sharma was matched to Bed A in Room 101 with an optimal composite score of 88.5/100.",
  breakdown: {
    P: 92,
    C: 85,
    F: 90,
    D: 88,
    K: 87,
  },
  constraints: [
    { code: "HC1", name: "Cohort Eligibility", passed: true, detail: "Application cleared hold" },
    { code: "HC2", name: "Single Placement", passed: true, detail: "Exactly one bed assigned" },
    { code: "HC3", name: "Bed Available", passed: true, detail: "Bed not oversubscribed" },
    { code: "HC4", name: "Gender Policy", passed: true, detail: "Male residency rules satisfied" },
    { code: "HC5", name: "Quota Reservation", passed: true, detail: "Placed within quota bounds" },
    { code: "HC6", name: "Accessibility", passed: true, detail: "Certified accessible bed" },
    { code: "HC7", name: "Programme Eligibility", passed: true, detail: "CS department permitted" },
    { code: "HC8", name: "Fee Category", passed: true, detail: "Standard tier satisfied" },
    { code: "HC9", name: "Reserved Bed Hold", passed: true, detail: "No hold conflicts" },
    { code: "HC10", name: "Confirmed Group", passed: true, detail: "Group adjacency verified" },
    { code: "HC11", name: "Roommate Compatibility", passed: true, detail: "Zero deal-breakers" },
  ],
  alternativesConsidered: [
    {
      room: "102",
      hostel: "Kaveri Hostel",
      rank: 2,
      score: 84.1,
      reason: "Further from accessible entrance",
    },
    {
      room: "205",
      hostel: "Kaveri Hostel",
      rank: 3,
      score: 79.5,
      reason: "Upper floor requires elevator",
    },
  ],
  tiebreakInfo:
    "Deterministically resolved based on academic score and submission timestamp with seed 42.",
  isOverridden: false,
};

describe("ExplanationDrawer Component", () => {
  it("renders friendly sentence and composite score", () => {
    render(<ExplanationDrawer open={true} onOpenChange={vi.fn()} assignment={mockAssignment} />);

    expect(screen.getByText(/Arjun Sharma was matched to Bed A in Room 101/i)).toBeDefined();
    expect(screen.getByText(/Score:\s*88\.5\s*\/\s*100/i)).toBeDefined();
  });

  it("renders algorithmic breakdown sub-scores (P, C, F, D, K)", () => {
    render(<ExplanationDrawer open={true} onOpenChange={vi.fn()} assignment={mockAssignment} />);

    expect(screen.getByText(/P — Academic & Policy Priority/i)).toBeDefined();
    expect(screen.getByText(/C — Questionnaire Compatibility/i)).toBeDefined();
    expect(screen.getByText(/F — Floor & Room Type Preference/i)).toBeDefined();
    expect(screen.getByText(/D — Proximity to Academic Block/i)).toBeDefined();
    expect(screen.getByText(/K — Residential Continuity/i)).toBeDefined();
    expect(screen.getByText("92%")).toBeDefined();
  });

  it("renders hard constraint pass verification badges (HC1 to HC11)", () => {
    render(<ExplanationDrawer open={true} onOpenChange={vi.fn()} assignment={mockAssignment} />);

    expect(screen.getByText(/HC1: Cohort Eligibility/i)).toBeDefined();
    expect(screen.getByText(/HC6: Accessibility/i)).toBeDefined();
    expect(screen.getByText(/HC11: Roommate Compatibility/i)).toBeDefined();
    expect(screen.getByText(/Hard Constraints Certified \(11\/11 Verified\)/i)).toBeDefined();
  });

  it("renders alternatives considered and tiebreak information", () => {
    render(<ExplanationDrawer open={true} onOpenChange={vi.fn()} assignment={mockAssignment} />);

    expect(screen.getByText(/Further from accessible entrance/i)).toBeDefined();
    expect(screen.getByText(/Deterministically resolved based on academic score/i)).toBeDefined();
  });
});

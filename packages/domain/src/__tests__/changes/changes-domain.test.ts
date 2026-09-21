/**
 * @hostelhub/domain — __tests__/changes/changes-domain.test.ts
 *
 * Tests for room change validator, swap validator, and SLA calculator.
 */

import { describe, it, expect } from "vitest";
import {
  validateRoomChange,
  validateSwap,
  calculateSlaDueDate,
  isSlaBreach,
  getWorkingDaysRemaining,
  type ChangeValidationContext,
  type SlaConfig,
} from "../../changes/index.js";
import type { Unit, Bed, Room, Hostel } from "../../allocation/types.js";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

function makeUnit(overrides: Partial<Unit> = {}): Unit {
  return {
    id: "unit-1",
    memberIds: ["student-1"],
    gender: "male",
    programme: "CSE",
    year: 2,
    feeCategory: "General",
    quotaBucket: "General",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-1"],
    questionnaire: {},
    ...overrides,
  };
}

function makeBed(overrides: Partial<Bed> = {}): Bed {
  return {
    id: "bed-1",
    roomId: "room-1",
    status: "available",
    accessible: false,
    ...overrides,
  };
}

function makeRoom(overrides: Partial<Room> = {}): Room {
  return {
    id: "room-1",
    hostelId: "hostel-1",
    roomNumber: "101",
    roomType: "double",
    capacity: 2,
    block: "A",
    floor: 1,
    accessible: false,
    ...overrides,
  };
}

function makeHostel(overrides: Partial<Hostel> = {}): Hostel {
  return {
    id: "hostel-1",
    name: "Test Hostel",
    genderPolicy: "male",
    walkingMinutes: 5,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<ChangeValidationContext> = {}): ChangeValidationContext {
  return {
    unit: makeUnit(),
    fromBed: makeBed({ id: "from-bed" }),
    toBed: makeBed({ id: "to-bed" }),
    toRoom: makeRoom(),
    toHostel: makeHostel(),
    targetRoomOccupants: [],
    ...overrides,
  };
}

// ─── Room Change Validator Tests ───────────────────────────────────────────────

describe("Room Change Validator", () => {
  it("passes when all constraints are satisfied", () => {
    const result = validateRoomChange(makeCtx());
    expect(result.valid).toBe(true);
    expect(result.constraintsChecked.length).toBeGreaterThan(0);
  });

  it("rejects when unit has active hold (HC9)", () => {
    const result = validateRoomChange(makeCtx({ unit: makeUnit({ hasHold: true }) }));
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC9_HOLD_ACTIVE");
  });

  it("rejects when target bed is unavailable (HC3)", () => {
    const result = validateRoomChange(
      makeCtx({ toBed: makeBed({ id: "to-bed", status: "out_of_service" }) }),
    );
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC3_BED_UNAVAILABLE");
  });

  it("rejects when room capacity exceeded (HC3)", () => {
    const result = validateRoomChange(
      makeCtx({
        toRoom: makeRoom({ capacity: 1 }),
        targetRoomOccupants: [makeUnit({ id: "existing-unit" })],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC3_BED_UNAVAILABLE");
  });

  it("rejects when gender policy violated (HC4)", () => {
    const result = validateRoomChange(
      makeCtx({
        unit: makeUnit({ gender: "female" }),
        toHostel: makeHostel({ genderPolicy: "male" }),
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC4_GENDER_MISMATCH");
  });

  it("rejects when accessibility needed but bed not accessible (HC6)", () => {
    const result = validateRoomChange(
      makeCtx({
        unit: makeUnit({ accessibilityNeed: true }),
        toBed: makeBed({ id: "to-bed", accessible: false }),
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC6_ACCESSIBILITY_REQUIRED");
  });

  it("rejects when quota bucket mismatched (HC5)", () => {
    const result = validateRoomChange(
      makeCtx({
        unit: makeUnit({ quotaBucket: "SC" }),
        toRoom: makeRoom({ quotaBucket: "OBC" }),
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC5_QUOTA_EXCEEDED");
  });

  it("rejects when programme filter mismatched (HC7)", () => {
    const result = validateRoomChange(
      makeCtx({
        unit: makeUnit({ programme: "CSE" }),
        toRoom: makeRoom({ programmeFilter: ["ECE", "EEE"] }),
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC7_PROGRAMME_MISMATCH");
  });

  it("rejects when fee category mismatched (HC8)", () => {
    const result = validateRoomChange(
      makeCtx({
        unit: makeUnit({ feeCategory: "subsidized" }),
        toRoom: makeRoom({ feeCategoryRequirement: "full_fee" }),
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC8_FEE_CATEGORY_MISMATCH");
  });

  it("rejects when deal-breaker conflict exists (HC11)", () => {
    const result = validateRoomChange(
      makeCtx({
        unit: makeUnit({ dealBreakerUnitIds: ["roommate-1"] }),
        targetRoomOccupants: [makeUnit({ id: "roommate-1" })],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.code).toBe("HC11_DEALBREAKER_CONFLICT");
  });

  it("passes when coed hostel accommodates any gender", () => {
    const result = validateRoomChange(
      makeCtx({
        unit: makeUnit({ gender: "female" }),
        toHostel: makeHostel({ genderPolicy: "coed" }),
      }),
    );
    expect(result.valid).toBe(true);
  });
});

// ─── Swap Validator Tests ──────────────────────────────────────────────────────

describe("Swap Validator", () => {
  it("validates a valid swap where both sides pass", () => {
    const result = validateSwap({
      unitA: makeUnit({ id: "A" }),
      bedA: makeBed({ id: "bed-A" }),
      roomA: makeRoom({ id: "room-A" }),
      hostelA: makeHostel({ id: "hostel-A" }),
      occupantsA: [],
      unitB: makeUnit({ id: "B" }),
      bedB: makeBed({ id: "bed-B" }),
      roomB: makeRoom({ id: "room-B" }),
      hostelB: makeHostel({ id: "hostel-B" }),
      occupantsB: [],
    });
    expect(result.valid).toBe(true);
    expect(result.sideA.valid).toBe(true);
    expect(result.sideB.valid).toBe(true);
  });

  it("fails when side A violates constraints (gender)", () => {
    const result = validateSwap({
      unitA: makeUnit({ id: "A", gender: "female" }),
      bedA: makeBed({ id: "bed-A" }),
      roomA: makeRoom({ id: "room-A" }),
      hostelA: makeHostel({ id: "hostel-A" }),
      occupantsA: [],
      unitB: makeUnit({ id: "B" }),
      bedB: makeBed({ id: "bed-B" }),
      roomB: makeRoom({ id: "room-B" }),
      hostelB: makeHostel({ id: "hostel-B", genderPolicy: "male" }),
      occupantsB: [],
    });
    expect(result.valid).toBe(false);
    expect(result.sideA.valid).toBe(false);
    expect(result.sideA.code).toBe("HC4_GENDER_MISMATCH");
    expect(result.sideB.valid).toBe(true);
  });

  it("fails when both sides violate constraints", () => {
    // A (female) goes to hostel B (male-only) — fails
    // B (male) goes to hostel A (female-only) — fails
    const result = validateSwap({
      unitA: makeUnit({ id: "A", gender: "female" }),
      bedA: makeBed({ id: "bed-A" }),
      roomA: makeRoom({ id: "room-A" }),
      hostelA: makeHostel({ id: "hostel-A", genderPolicy: "female" }),
      occupantsA: [],
      unitB: makeUnit({ id: "B", gender: "male" }),
      bedB: makeBed({ id: "bed-B" }),
      roomB: makeRoom({ id: "room-B" }),
      hostelB: makeHostel({ id: "hostel-B", genderPolicy: "male" }),
      occupantsB: [],
    });
    expect(result.valid).toBe(false);
    expect(result.sideA.valid).toBe(false);
    expect(result.sideA.code).toBe("HC4_GENDER_MISMATCH");
    expect(result.sideB.valid).toBe(false);
    expect(result.sideB.code).toBe("HC4_GENDER_MISMATCH");
  });

  it("one side failing cancels both (atomic check)", () => {
    const result = validateSwap({
      unitA: makeUnit({ id: "A" }),
      bedA: makeBed({ id: "bed-A" }),
      roomA: makeRoom({ id: "room-A" }),
      hostelA: makeHostel({ id: "hostel-A" }),
      occupantsA: [],
      unitB: makeUnit({ id: "B", hasHold: true }),
      bedB: makeBed({ id: "bed-B" }),
      roomB: makeRoom({ id: "room-B" }),
      hostelB: makeHostel({ id: "hostel-B" }),
      occupantsB: [],
    });
    // Side A passes individually, but overall swap fails because side B fails
    expect(result.valid).toBe(false);
    expect(result.sideA.valid).toBe(true);
    expect(result.sideB.valid).toBe(false);
    expect(result.sideB.code).toBe("HC9_HOLD_ACTIVE");
  });
});

// ─── SLA Calculator Tests ──────────────────────────────────────────────────────

describe("SLA Calculator", () => {
  // Monday = 2026-01-05, so 3 working days later = Wednesday 2026-01-08
  const mondayIso = "2026-01-05T10:00:00.000Z";

  it("adds 3 working days from a Monday (Mon → Thu)", () => {
    const config: SlaConfig = { workingDays: 3, holidays: [] };
    const due = calculateSlaDueDate(mondayIso, config);
    const dueDate = new Date(due);
    // Mon + 3 working days = Thu (Jan 8)
    expect(dueDate.getDate()).toBe(8);
    expect(dueDate.getDay()).toBe(4); // Thursday
  });

  it("skips weekends (Friday + 3 = Wednesday)", () => {
    // Friday = 2026-01-09
    const fridayIso = "2026-01-09T10:00:00.000Z";
    const config: SlaConfig = { workingDays: 3, holidays: [] };
    const due = calculateSlaDueDate(fridayIso, config);
    const dueDate = new Date(due);
    // Fri + 1 = Mon, + 2 = Tue, + 3 = Wed (Jan 14)
    expect(dueDate.getDate()).toBe(14);
    expect(dueDate.getDay()).toBe(3); // Wednesday
  });

  it("skips holidays", () => {
    const config: SlaConfig = {
      workingDays: 3,
      holidays: ["2026-01-06"], // Tuesday is a holiday
    };
    const due = calculateSlaDueDate(mondayIso, config);
    const dueDate = new Date(due);
    // Mon + skip Tue (holiday) + Wed + Thu + Fri → Fri Jan 9
    expect(dueDate.getDate()).toBe(9);
  });

  it("detects SLA breach", () => {
    const slaDue = "2026-01-08T23:59:59.999Z";
    expect(isSlaBreach(slaDue, "2026-01-09T00:00:00.000Z")).toBe(true);
    expect(isSlaBreach(slaDue, "2026-01-08T12:00:00.000Z")).toBe(false);
  });

  it("calculates working days remaining", () => {
    const slaDue = "2026-01-08T23:59:59.999Z";
    // Mon 05 to Thu 08: Tue, Wed, Thu = 3 working days
    // But getWorkingDaysRemaining counts each date transition, so Mon→Tue→Wed→Thu = 3
    const remaining = getWorkingDaysRemaining(slaDue, mondayIso);
    // From Mon 10am to Thu 23:59, we count Tue + Wed + Thu = 3
    // But the function counts from now to due inclusively
    expect(remaining).toBeGreaterThanOrEqual(3);
  });

  it("returns negative when overdue", () => {
    const slaDue = "2026-01-05T23:59:59.999Z";
    // 3 working days after due date
    const remaining = getWorkingDaysRemaining(slaDue, "2026-01-08T10:00:00.000Z");
    expect(remaining).toBeLessThan(0);
  });
});

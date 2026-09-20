import { describe, it, expect } from "vitest";
import { validateOverride } from "../../review/override-validator.js";
import type { Unit, Room, Bed, Hostel } from "../../allocation/types.js";

describe("Override Validator", () => {
  const baseHostel: Hostel = {
    id: "h1",
    name: "Aryabhata Hall",
    genderPolicy: "male",
    walkingMinutes: 5,
  };

  const baseUnit: Unit = {
    id: "app_1",
    memberIds: ["stu_1"],
    gender: "male",
    programme: "BTech",
    year: 1,
    feeCategory: "regular",
    quotaBucket: "General",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["h1"],
    questionnaire: {},
  };

  const baseBed: Bed = {
    id: "bed_101_a",
    roomId: "room_101",
    status: "available",
    accessible: false,
  };

  const targetBed: Bed = {
    id: "bed_102_a",
    roomId: "room_102",
    status: "available",
    accessible: false,
  };

  const targetRoom: Room = {
    id: "room_102",
    hostelId: "h1",
    roomNumber: "102",
    floor: 1,
    block: "A",
    roomType: "double",
    capacity: 2,
    accessible: false,
  };

  it("rejects override with reason shorter than 10 characters", () => {
    const res = validateOverride(
      {
        draftId: "d1",
        assignmentId: "a1",
        applicationId: "app_1",
        studentId: "stu_1",
        fromBedId: "bed_101_a",
        toBedId: "bed_102_a",
        reason: "too short",
      },
      {
        unit: baseUnit,
        fromBed: baseBed,
        fromHostelId: "h1",
        toBed: targetBed,
        toRoom: targetRoom,
        toHostel: baseHostel,
        targetRoomOccupants: [],
      },
    );

    expect(res.valid).toBe(false);
    expect(res.code).toBe("INVALID_REASON");
  });

  it("rejects override if target bed is already occupied", () => {
    const res = validateOverride(
      {
        draftId: "d1",
        assignmentId: "a1",
        applicationId: "app_1",
        studentId: "stu_1",
        fromBedId: "bed_101_a",
        toBedId: "bed_102_a",
        reason: "Warden manual reassignment for special project.",
      },
      {
        unit: baseUnit,
        fromBed: baseBed,
        fromHostelId: "h1",
        toBed: targetBed,
        toRoom: targetRoom,
        toHostel: baseHostel,
        targetRoomOccupants: [],
        targetBedOccupantUnitId: "other_unit",
      },
    );

    expect(res.valid).toBe(false);
    expect(res.code).toBe("BED_OCCUPIED");
  });

  it("rejects override violating HC4 gender policy", () => {
    const femaleHostel: Hostel = { ...baseHostel, id: "h_female", genderPolicy: "female" };
    const res = validateOverride(
      {
        draftId: "d1",
        assignmentId: "a1",
        applicationId: "app_1",
        studentId: "stu_1",
        fromBedId: "bed_101_a",
        toBedId: "bed_102_a",
        reason: "Valid reason exceeding 10 characters easily.",
      },
      {
        unit: baseUnit,
        fromBed: baseBed,
        fromHostelId: "h1",
        toBed: targetBed,
        toRoom: targetRoom,
        toHostel: femaleHostel,
        targetRoomOccupants: [],
      },
    );

    expect(res.valid).toBe(false);
    expect(res.code).toBe("HC4_GENDER_MISMATCH");
  });

  it("rejects override with mutual deal-breaker conflict with prospective roommate", () => {
    const unitWithDealBreaker: Unit = {
      ...baseUnit,
      dealBreakerUnitIds: ["stu_smoker"],
      questionnaire: {
        sleep: { value: 1, importance: 3, dealBreaker: true },
      },
    };

    const smokingRoommate: Unit = {
      id: "stu_smoker",
      memberIds: ["stu_2"],
      gender: "male",
      programme: "BTech",
      year: 1,
      feeCategory: "regular",
      quotaBucket: "General",
      hasHold: false,
      accessibilityNeed: false,
      preferenceHostelIds: ["h1"],
      questionnaire: {
        sleep: { value: 5, importance: 3, dealBreaker: true },
      },
    };

    const res = validateOverride(
      {
        draftId: "d1",
        assignmentId: "a1",
        applicationId: "app_1",
        studentId: "stu_1",
        fromBedId: "bed_101_a",
        toBedId: "bed_102_a",
        reason: "Valid administrative transfer request reason.",
      },
      {
        unit: unitWithDealBreaker,
        fromBed: baseBed,
        fromHostelId: "h1",
        toBed: targetBed,
        toRoom: targetRoom,
        toHostel: baseHostel,
        targetRoomOccupants: [smokingRoommate],
      },
    );

    expect(res.valid).toBe(false);
    expect(res.code).toBe("HC11_DEALBREAKER_CONFLICT");
  });

  it("identifies escalated override when moving to accessible bed", () => {
    const accessibleTargetBed: Bed = { ...targetBed, accessible: true };

    const res = validateOverride(
      {
        draftId: "d1",
        assignmentId: "a1",
        applicationId: "app_1",
        studentId: "stu_1",
        fromBedId: "bed_101_a",
        toBedId: "bed_102_a",
        reason: "Valid administrative transfer request reason.",
      },
      {
        unit: baseUnit,
        fromBed: baseBed,
        fromHostelId: "h1",
        toBed: accessibleTargetBed,
        toRoom: targetRoom,
        toHostel: baseHostel,
        targetRoomOccupants: [],
      },
    );

    expect(res.valid).toBe(true);
    expect(res.escalated).toBe(true);
    expect(res.escalationReasons.length).toBeGreaterThan(0);
  });
});

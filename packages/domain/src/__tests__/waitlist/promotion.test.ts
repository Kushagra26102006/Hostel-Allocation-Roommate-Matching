import { describe, it, expect } from "vitest";
import { findPromotionCandidate, reorderWaitlistQueue } from "../../waitlist/promotion-engine.js";
import type { WaitlistUnit, PromotionContext } from "../../waitlist/types.js";
import type { Bed, Room, Hostel } from "../../allocation/types.js";

describe("Prompt 21 — Waitlist Promotion Engine (Pure Logic)", () => {
  const dummyHostel: Hostel = {
    id: "hostel-1",
    name: "Aryabhata Hall",
    genderPolicy: "male",
    walkingMinutes: 5,
  };

  const dummyRoom: Room = {
    id: "room-101",
    roomNumber: "101",
    hostelId: "hostel-1",
    block: "A",
    floor: 1,
    capacity: 2,
    roomType: "double",
    accessible: false,
  };

  const bedA: Bed = {
    id: "bed-101a",
    roomId: "room-101",
    status: "available",
    accessible: false,
  };

  const bedB: Bed = {
    id: "bed-101b",
    roomId: "room-101",
    status: "available",
    accessible: false,
  };

  it("promotes the correct top-priority student when feasible", () => {
    const waitlist: WaitlistUnit[] = [
      {
        id: "unit-1",
        position: 1,
        priorityScore: 92,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "stud-1",
            applicationId: "app-1",
            name: "Rohit Verma",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 92,
          },
        ],
      },
      {
        id: "unit-2",
        position: 2,
        priorityScore: 88,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "stud-2",
            applicationId: "app-2",
            name: "Sunil Das",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 88,
          },
        ],
      },
    ];

    const ctx: PromotionContext = {
      vacatedBed: bedA,
      vacatedRoom: dummyRoom,
      vacatedHostel: dummyHostel,
      availableBedsInRoom: [bedA],
      currentRoomOccupantUnits: [],
      allWaitlistedUnits: waitlist,
    };

    const result = findPromotionCandidate(ctx);
    expect(result.unit).not.toBeNull();
    expect(result.unit?.id).toBe("unit-1");
    expect(result.targetBeds).toHaveLength(1);
    expect(result.targetBeds[0]?.id).toBe("bed-101a");
    expect(result.skippedUnits).toHaveLength(0);
  });

  it("skips an unfit student and promotes the next eligible student", () => {
    const waitlist: WaitlistUnit[] = [
      {
        id: "unit-female",
        position: 1,
        priorityScore: 95,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "stud-female",
            applicationId: "app-f",
            name: "Ananya Sen",
            gender: "female", // Mismatch with boys_only hostel
            hasAccessibilityNeed: false,
            priorityScore: 95,
          },
        ],
      },
      {
        id: "unit-male",
        position: 2,
        priorityScore: 89,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "stud-male",
            applicationId: "app-m",
            name: "Vikram Malhotra",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 89,
          },
        ],
      },
    ];

    const ctx: PromotionContext = {
      vacatedBed: bedA,
      vacatedRoom: dummyRoom,
      vacatedHostel: dummyHostel,
      availableBedsInRoom: [bedA],
      currentRoomOccupantUnits: [],
      allWaitlistedUnits: waitlist,
    };

    const result = findPromotionCandidate(ctx);
    expect(result.unit?.id).toBe("unit-male");
    expect(result.skippedUnits).toHaveLength(1);
    expect(result.skippedUnits[0]?.unitId).toBe("unit-female");
    expect(result.skippedUnits[0]?.reasonCode).toBe("HC4_GENDER_MISMATCH");
  });

  it("skips a student with accessibility need if bed is not accessible", () => {
    const waitlist: WaitlistUnit[] = [
      {
        id: "unit-accessible-need",
        position: 1,
        priorityScore: 96,
        policyTier: 1,
        quotaBucket: "pwd",
        status: "waiting",
        members: [
          {
            id: "stud-pwd",
            applicationId: "app-pwd",
            name: "Deepak Kumar",
            gender: "male",
            hasAccessibilityNeed: true,
            priorityScore: 96,
          },
        ],
      },
      {
        id: "unit-standard",
        position: 2,
        priorityScore: 84,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "stud-std",
            applicationId: "app-std",
            name: "Naveen Raj",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 84,
          },
        ],
      },
    ];

    const ctx: PromotionContext = {
      vacatedBed: bedA, // bedA is NOT accessible
      vacatedRoom: dummyRoom,
      vacatedHostel: dummyHostel,
      availableBedsInRoom: [bedA],
      currentRoomOccupantUnits: [],
      allWaitlistedUnits: waitlist,
    };

    const result = findPromotionCandidate(ctx);
    expect(result.unit?.id).toBe("unit-standard");
    expect(result.skippedUnits[0]?.unitId).toBe("unit-accessible-need");
    expect(result.skippedUnits[0]?.reasonCode).toBe("ACCESSIBILITY_MISMATCH");
  });

  it("skips group if group size exceeds available beds in room", () => {
    const waitlist: WaitlistUnit[] = [
      {
        id: "group-unit-3",
        position: 1,
        priorityScore: 94,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "m1",
            applicationId: "a1",
            name: "Member 1",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 94,
          },
          {
            id: "m2",
            applicationId: "a2",
            name: "Member 2",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 94,
          },
        ],
      },
      {
        id: "single-unit-2",
        position: 2,
        priorityScore: 85,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "m3",
            applicationId: "a3",
            name: "Single Student",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 85,
          },
        ],
      },
    ];

    // Room only has 1 available bed (bedA), while group needs 2
    const ctx: PromotionContext = {
      vacatedBed: bedA,
      vacatedRoom: dummyRoom,
      vacatedHostel: dummyHostel,
      availableBedsInRoom: [bedA],
      currentRoomOccupantUnits: [],
      allWaitlistedUnits: waitlist,
    };

    const result = findPromotionCandidate(ctx);
    expect(result.unit?.id).toBe("single-unit-2");
    expect(result.skippedUnits[0]?.unitId).toBe("group-unit-3");
    expect(result.skippedUnits[0]?.reasonCode).toBe("GROUP_DOES_NOT_FIT");
  });

  it("promotes group if all members fit in available beds in room", () => {
    const groupUnit: WaitlistUnit = {
      id: "group-duo",
      position: 1,
      priorityScore: 94,
      policyTier: 1,
      quotaBucket: "general",
      status: "waiting",
      members: [
        {
          id: "m1",
          applicationId: "a1",
          name: "Member 1",
          gender: "male",
          hasAccessibilityNeed: false,
          priorityScore: 94,
        },
        {
          id: "m2",
          applicationId: "a2",
          name: "Member 2",
          gender: "male",
          hasAccessibilityNeed: false,
          priorityScore: 94,
        },
      ],
    };

    // Room has BOTH bedA and bedB available
    const ctx: PromotionContext = {
      vacatedBed: bedA,
      vacatedRoom: dummyRoom,
      vacatedHostel: dummyHostel,
      availableBedsInRoom: [bedA, bedB],
      currentRoomOccupantUnits: [],
      allWaitlistedUnits: [groupUnit],
    };

    const result = findPromotionCandidate(ctx);
    expect(result.unit?.id).toBe("group-duo");
    expect(result.targetBeds).toHaveLength(2);
    expect(result.skippedUnits).toHaveLength(0);
  });

  it("reorders waitlist queue and enforces mandatory reason >= 10 chars", () => {
    const waitlist: WaitlistUnit[] = [
      {
        id: "u1",
        position: 1,
        priorityScore: 90,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "s1",
            applicationId: "a1",
            name: "S1",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 90,
          },
        ],
      },
      {
        id: "u2",
        position: 2,
        priorityScore: 85,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "s2",
            applicationId: "a2",
            name: "S2",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 85,
          },
        ],
      },
      {
        id: "u3",
        position: 3,
        priorityScore: 80,
        policyTier: 1,
        quotaBucket: "general",
        status: "waiting",
        members: [
          {
            id: "s3",
            applicationId: "a3",
            name: "S3",
            gender: "male",
            hasAccessibilityNeed: false,
            priorityScore: 80,
          },
        ],
      },
    ];

    const actor = { id: "warden-1", email: "warden@test.edu", role: "warden" };

    // Less than 10 characters should throw
    expect(() => {
      reorderWaitlistQueue(waitlist, "u3", 1, "Short", actor);
    }).toThrow(/at least 10 characters/);

    // Valid reorder: move u3 to position 1
    const reordered = reorderWaitlistQueue(
      waitlist,
      "u3",
      1,
      "Approved medical appeal by Chief Warden committee.",
      actor,
    );

    expect(reordered.updatedEntries[0]?.id).toBe("u3");
    expect(reordered.updatedEntries[0]?.position).toBe(1);
    expect(reordered.updatedEntries[1]?.id).toBe("u1");
    expect(reordered.updatedEntries[1]?.position).toBe(2);
    expect(reordered.updatedEntries[2]?.id).toBe("u2");
    expect(reordered.updatedEntries[2]?.position).toBe(3);

    expect(reordered.movedEntry.reorderHistory).toHaveLength(1);
    expect(reordered.movedEntry.reorderHistory?.[0]?.reason).toBe(
      "Approved medical appeal by Chief Warden committee.",
    );
  });
});

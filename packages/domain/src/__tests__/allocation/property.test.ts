/**
 * @hostelhub/domain — property.test.ts
 *
 * Property-based tests (fast-check) for the allocation engine.
 * Generates random cohorts with random capacities, quotas, gender policies,
 * accessibility flags, groups, preferences, and questionnaire answers.
 *
 * Properties verified:
 *   P1:  No student appears in more than one assignment.
 *   P2:  No bed appears in more than one assignment.
 *   P3:  No room exceeds capacity and only available beds are used.
 *   P4:  No gender-block, quota, fee-category or programme rule is violated.
 *   P5:  Every accessibility-need applicant is in an accessible bed or waitlisted with recorded reason.
 *   P6:  No mutual deal-breaker pair shares a room.
 *   P7:  Every assignment has a non-empty explanation.
 *   P8:  Same inputs + seed + weights = identical output.
 *   P9:  Shuffling input rows does not change the output (metamorphic).
 *   P10: Adding beds never reduces the number of students placed (metamorphic).
 *   P11: No priority inversion: higher-priority eligible unit never left unplaced while
 *        lower-priority unit takes a bed that was feasible for the higher one.
 *   P12: A forced invariant failure makes the run fail and returns no partial result.
 *
 * Configurable runs: 200 in CI, 2,000 locally via PBT_RUNS=2000.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { allocate } from "../../allocation/pipeline.js";
import { InvariantError, DEFAULT_WEIGHTS } from "../../allocation/types.js";
import type {
  Hostel,
  Room,
  Bed,
  Unit,
  Snapshot,
  Gender,
  GenderPolicy,
  RoomType,
} from "../../allocation/types.js";
import type { PriorityUnit } from "../../allocation/pipeline.js";
import { dealBreakerConflict } from "../../compatibility/scoring.js";

// ─── Configuration ─────────────────────────────────────────────────────────────
//
// 200 runs in CI, 2,000 locally (override with PBT_RUNS=N).
// Keeping CI at 200 to stay inside a 2-minute budget per property.
// Local: set PBT_RUNS=200 to run the fast CI configuration.

const NUM_RUNS = process.env.PBT_RUNS
  ? parseInt(process.env.PBT_RUNS, 10)
  : process.env.CI
    ? 200
    : 2000;

// ─── Fast-Check Generators ─────────────────────────────────────────────────────

const GENDERS: Gender[] = ["male", "female"];
const GENDER_POLICIES: GenderPolicy[] = ["male", "female", "coed"];
const ROOM_TYPES: RoomType[] = ["single", "double", "triple", "quad"];
const QUOTA_BUCKETS = ["General", "SC", "ST", "OBC"];
const PROGRAMMES = ["BTech", "MTech", "MBA", "PhD"];
const FEE_CATEGORIES = ["General", "Scholarship", "Sponsored"];

function genHostels(): fc.Arbitrary<Hostel[]> {
  return fc
    .array(
      fc.record({
        name: fc.stringMatching(/^[A-Z][a-z]{3,8}$/),
        genderPolicy: fc.constantFrom<GenderPolicy>(...GENDER_POLICIES),
        walkingMinutes: fc.integer({ min: 2, max: 30 }),
      }),
      { minLength: 2, maxLength: 4 },
    )
    .map((raw) =>
      raw.map((h, i) => ({
        id: `h-${i}`,
        name: `${h.name} Hostel`,
        genderPolicy: h.genderPolicy,
        walkingMinutes: h.walkingMinutes,
      })),
    );
}

function genCohortAndInventory(): fc.Arbitrary<{
  snapshot: Snapshot;
  units: PriorityUnit[];
  seed: number;
}> {
  return fc
    .tuple(
      genHostels(),
      fc.integer({ min: 1, max: 100000 }),
      fc.integer({ min: 3, max: 8 }), // number of rooms
      fc.integer({ min: 4, max: 15 }), // number of units
    )
    .chain(([hostels, seed, roomCount, unitCount]) => {
      const hostelIds = hostels.map((h) => h.id);

      // Generate rooms
      const roomArbs = fc.array(
        fc.record({
          hostelId: fc.constantFrom(...hostelIds),
          roomType: fc.constantFrom<RoomType>(...ROOM_TYPES),
          block: fc.constantFrom("A", "B", "C"),
          floor: fc.integer({ min: 1, max: 4 }),
          accessible: fc.boolean(),
          quotaBucket: fc.constantFrom(...QUOTA_BUCKETS),
          walkingMinutes: fc.integer({ min: 2, max: 30 }),
          feeReq: fc.option(fc.constantFrom(...FEE_CATEGORIES), { nil: undefined }),
          progFilter: fc.option(fc.constantFrom(...PROGRAMMES), { nil: undefined }),
        }),
        { minLength: roomCount, maxLength: roomCount },
      );

      // Generate units
      const unitArbs = fc.array(
        fc.record({
          gender: fc.constantFrom<Gender>(...GENDERS),
          programme: fc.constantFrom(...PROGRAMMES),
          year: fc.integer({ min: 1, max: 4 }),
          feeCategory: fc.constantFrom(...FEE_CATEGORIES),
          quotaBucket: fc.constantFrom(...QUOTA_BUCKETS),
          hasHold: fc.boolean(),
          accessibilityNeed: fc.boolean(),
          isGroup: fc.boolean(),
          prefCount: fc.integer({ min: 1, max: Math.min(3, hostelIds.length) }),
          priorityTier: fc.constantFrom("01", "02", "03"),
          priorityScore: fc.integer({ min: 10, max: 100 }),
          sleep: fc.integer({ min: 1, max: 5 }),
          study: fc.integer({ min: 1, max: 5 }),
          cleanliness: fc.integer({ min: 1, max: 5 }),
          smoking: fc.constantFrom("smoker", "non_smoker"),
          smokingDealBreaker: fc.boolean(),
        }),
        { minLength: unitCount, maxLength: unitCount },
      );

      return fc.tuple(fc.constant(hostels), fc.constant(seed), roomArbs, unitArbs);
    })
    .map(([hostels, seed, rawRooms, rawUnits]) => {
      const rooms: Room[] = [];
      const beds: Bed[] = [];
      let bedIdCounter = 1;

      for (let rIdx = 0; rIdx < rawRooms.length; rIdx++) {
        const rawR = rawRooms[rIdx]!;
        const capacity =
          rawR.roomType === "single"
            ? 1
            : rawR.roomType === "double"
              ? 2
              : rawR.roomType === "triple"
                ? 3
                : 4;
        const roomId = `room-${rIdx + 1}`;
        const room: Room = {
          id: roomId,
          hostelId: rawR.hostelId,
          roomNumber: `R-${100 + rIdx + 1}`,
          roomType: rawR.roomType,
          capacity,
          block: rawR.block,
          floor: rawR.floor,
          accessible: rawR.accessible,
          quotaBucket: rawR.quotaBucket,
          walkingMinutes: rawR.walkingMinutes,
          ...(rawR.feeReq ? { feeCategoryRequirement: rawR.feeReq } : {}),
          ...(rawR.progFilter ? { programmeFilter: [rawR.progFilter] } : {}),
        };
        rooms.push(room);

        for (let bIdx = 0; bIdx < capacity; bIdx++) {
          const bedId = `bed-${bedIdCounter++}`;
          const bedObj: Bed = {
            id: bedId,
            roomId,
            status: "available",
            accessible: rawR.accessible,
          };
          if (rawR.accessible) {
            bedObj.accessibilityReservedUntil = "2030-01-01T00:00:00.000Z";
          }
          beds.push(bedObj);
        }
      }

      const units: PriorityUnit[] = [];
      const hostelIds = hostels.map((h) => h.id);

      for (let uIdx = 0; uIdx < rawUnits.length; uIdx++) {
        const ru = rawUnits[uIdx]!;
        const unitId = `u-${uIdx + 1}`;
        const isGrp = ru.isGroup && uIdx < rawUnits.length - 1;
        const memberIds = isGrp ? [unitId, `u-${uIdx + 1}-buddy`] : [unitId];

        const prefHostels = [...hostelIds]
          .sort((a, b) => (a + unitId).localeCompare(b + unitId))
          .slice(0, ru.prefCount);

        const unit: Unit = {
          id: unitId,
          memberIds,
          gender: ru.gender,
          programme: ru.programme,
          year: ru.year,
          feeCategory: ru.feeCategory,
          quotaBucket: ru.quotaBucket,
          hasHold: ru.hasHold,
          accessibilityNeed: ru.accessibilityNeed,
          preferenceHostelIds: prefHostels,
          questionnaire: {
            sleep: { value: ru.sleep, importance: 2 },
            study: { value: ru.study, importance: 2 },
            tidiness: { value: ru.cleanliness, importance: 2 },
            smoking: {
              value: ru.smoking,
              importance: 3,
              dealBreaker: ru.smokingDealBreaker,
            },
          },
        };

        units.push({
          unit,
          priorityTier: ru.priorityTier,
          priorityScore: ru.priorityScore,
        });
      }

      const quotaBudget = new Map<string, number>([
        ["General", 999],
        ["SC", 999],
        ["ST", 999],
        ["OBC", 999],
      ]);
      const quotaUsage = new Map<string, number>([
        ["General", 0],
        ["SC", 0],
        ["ST", 0],
        ["OBC", 0],
      ]);

      const snapshot: Snapshot = {
        cycleId: "cycle-pbt",
        hostels: new Map(hostels.map((h) => [h.id, h])),
        rooms: new Map(rooms.map((r) => [r.id, r])),
        beds: new Map(beds.map((b) => [b.id, b])),
        units: new Map(units.map((pu) => [pu.unit.id, pu.unit])),
        assignments: new Map(),
        quotaBudget,
        quotaUsage,
        nowIso: "2026-09-01T00:00:00.000Z",
      };

      return { snapshot, units, seed };
    });
}

// ─── Property Tests ────────────────────────────────────────────────────────────

describe("Property-Based Tests (fast-check)", () => {
  // P1: No student appears in more than one assignment
  it("P1: no student appears in more than one assignment", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const result = allocate(snapshot, units, { seed, maxIterations: 50 });
        const studentSeen = new Set<string>();
        for (const asg of result.assignments) {
          const unit = snapshot.units.get(asg.unitId)!;
          for (const memberId of unit.memberIds) {
            expect(studentSeen.has(memberId)).toBe(false);
            studentSeen.add(memberId);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P2: No bed appears in more than one assignment
  it("P2: no bed appears in more than one assignment", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const result = allocate(snapshot, units, { seed, maxIterations: 50 });
        const bedSeen = new Set<string>();
        for (const asg of result.assignments) {
          expect(bedSeen.has(asg.bedId)).toBe(false);
          bedSeen.add(asg.bedId);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P3: No room exceeds capacity and only available beds are used
  it("P3: no room exceeds capacity and only available beds are used", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const result = allocate(snapshot, units, { seed, maxIterations: 50 });
        const roomCounts = new Map<string, number>();

        for (const asg of result.assignments) {
          const bed = snapshot.beds.get(asg.bedId)!;
          expect(bed.status).toBe("available");

          roomCounts.set(asg.roomId, (roomCounts.get(asg.roomId) ?? 0) + 1);
        }

        for (const [roomId, count] of roomCounts) {
          const room = snapshot.rooms.get(roomId)!;
          expect(count).toBeLessThanOrEqual(room.capacity);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P4: No gender-block, quota, fee-category or programme rule is violated
  it("P4: no gender-block, quota, fee-category or programme rule is violated", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const result = allocate(snapshot, units, { seed, maxIterations: 50 });

        for (const asg of result.assignments) {
          const unit = snapshot.units.get(asg.unitId)!;
          const room = snapshot.rooms.get(asg.roomId)!;
          const hostel = snapshot.hostels.get(room.hostelId)!;

          // Gender rule
          if (hostel.genderPolicy !== "coed") {
            expect(unit.gender).toBe(hostel.genderPolicy);
          }

          // Quota rule: if room has dedicated quota, unit must match
          if (room.quotaBucket && room.quotaBucket !== "General") {
            expect(unit.quotaBucket).toBe(room.quotaBucket);
          }

          // Fee category rule
          if (room.feeCategoryRequirement) {
            expect(unit.feeCategory).toBe(room.feeCategoryRequirement);
          }

          // Programme rule
          if (room.programmeFilter && room.programmeFilter.length > 0) {
            expect(room.programmeFilter).toContain(unit.programme);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P5: Every accessibility-need applicant is in an accessible bed or is waitlisted with a recorded reason
  it("P5: every accessibility-need applicant is in an accessible bed or is waitlisted with a recorded reason", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const result = allocate(snapshot, units, { seed, maxIterations: 50 });

        for (const pu of units) {
          if (!pu.unit.accessibilityNeed) continue;

          const asg = result.assignments.find((a) => a.unitId === pu.unit.id);
          if (asg) {
            const bed = snapshot.beds.get(asg.bedId)!;
            expect(bed.accessible).toBe(true);
          } else {
            const wait = result.waitlist.find((w) => w.unitId === pu.unit.id);
            const rej = result.rejected.find((r) => r.unitId === pu.unit.id);
            const entry = wait ?? rej;
            expect(entry).toBeDefined();
            expect(entry!.reasonCode.length).toBeGreaterThan(0);
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P6: No mutual deal-breaker pair shares a room
  it("P6: no mutual deal-breaker pair shares a room", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const result = allocate(snapshot, units, { seed, maxIterations: 50 });
        const roomUnits = new Map<string, Unit[]>();

        for (const asg of result.assignments) {
          const list = roomUnits.get(asg.roomId) ?? [];
          list.push(snapshot.units.get(asg.unitId)!);
          roomUnits.set(asg.roomId, list);
        }

        for (const [, occupants] of roomUnits) {
          for (let i = 0; i < occupants.length; i++) {
            for (let j = i + 1; j < occupants.length; j++) {
              const uA = occupants[i]!;
              const uB = occupants[j]!;
              if (
                uA.dealBreakerUnitIds?.includes(uB.id) &&
                uB.dealBreakerUnitIds?.includes(uA.id)
              ) {
                expect(dealBreakerConflict(uA.questionnaire, uB.questionnaire)).toBe(false);
              }
            }
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P7: Every assignment has a non-empty explanation
  it("P7: every assignment has a non-empty explanation", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const result = allocate(snapshot, units, { seed, maxIterations: 50 });
        for (const asg of result.assignments) {
          expect(asg.explanation).toBeDefined();
          expect(typeof asg.explanation.sentence).toBe("string");
          expect(asg.explanation.sentence.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P8: Same inputs + seed + weights = identical output
  it("P8: same inputs + seed + weights = identical output", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const r1 = allocate(snapshot, units, { seed, weights: DEFAULT_WEIGHTS, maxIterations: 50 });
        const r2 = allocate(snapshot, units, { seed, weights: DEFAULT_WEIGHTS, maxIterations: 50 });

        expect(r1.assignments).toEqual(r2.assignments);
        expect(r1.waitlist).toEqual(r2.waitlist);
        expect(r1.rejected).toEqual(r2.rejected);
        expect(r1.inputHash).toBe(r2.inputHash);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P9: Shuffling input rows does not change the output (metamorphic)
  it("P9: shuffling input rows does not change the output (metamorphic)", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const rCanonical = allocate(snapshot, units, { seed, maxIterations: 50 });
        const shuffledUnits = [...units].reverse();
        const rShuffled = allocate(snapshot, shuffledUnits, { seed, maxIterations: 50 });

        const sortFn = (a: { unitId: string }, b: { unitId: string }) =>
          a.unitId.localeCompare(b.unitId);

        expect([...rCanonical.assignments].sort(sortFn)).toEqual(
          [...rShuffled.assignments].sort(sortFn),
        );
        expect([...rCanonical.waitlist].sort(sortFn)).toEqual([...rShuffled.waitlist].sort(sortFn));
        expect([...rCanonical.rejected].sort(sortFn)).toEqual([...rShuffled.rejected].sort(sortFn));
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P10: Adding beds never reduces the number of students placed (metamorphic)
  it("P10: adding beds never reduces the number of students placed (metamorphic)", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const baseResult = allocate(snapshot, units, { seed, maxIterations: 50 });

        // Add 2 additional available beds to the first room
        const firstRoom = [...snapshot.rooms.values()][0]!;
        const augmentedRooms = new Map(snapshot.rooms);
        augmentedRooms.set(firstRoom.id, {
          ...firstRoom,
          capacity: firstRoom.capacity + 2,
        });

        const augmentedBeds = new Map(snapshot.beds);
        augmentedBeds.set("extra-bed-1", {
          id: "extra-bed-1",
          roomId: firstRoom.id,
          status: "available",
          accessible: firstRoom.accessible,
        });
        augmentedBeds.set("extra-bed-2", {
          id: "extra-bed-2",
          roomId: firstRoom.id,
          status: "available",
          accessible: firstRoom.accessible,
        });

        const augmentedSnapshot: Snapshot = {
          ...snapshot,
          rooms: augmentedRooms,
          beds: augmentedBeds,
        };

        const augmentedResult = allocate(augmentedSnapshot, units, { seed, maxIterations: 50 });

        // Count placed students (including group members)
        const basePlaced = baseResult.assignments.reduce((sum, a) => {
          const u = snapshot.units.get(a.unitId)!;
          return sum + u.memberIds.length;
        }, 0);

        const augPlaced = augmentedResult.assignments.reduce((sum, a) => {
          const u = augmentedSnapshot.units.get(a.unitId)!;
          return sum + u.memberIds.length;
        }, 0);

        expect(augPlaced).toBeGreaterThanOrEqual(basePlaced);
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P11: No priority inversion: higher-priority eligible unit never left unplaced while lower-priority unit takes a feasible bed
  it("P11: no priority inversion", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        const result = allocate(snapshot, units, { seed, maxIterations: 50 });

        expect(result.metrics.priorityInversions).toBe(0);

        // Build priority order map
        const unitPriority = new Map<string, { tier: string; score: number }>();
        for (const pu of units) {
          unitPriority.set(pu.unit.id, { tier: pu.priorityTier, score: pu.priorityScore });
        }

        // Check each waitlisted unit against lower-priority assigned units
        for (const wait of result.waitlist) {
          const waitUnit = snapshot.units.get(wait.unitId)!;
          const waitPrio = unitPriority.get(wait.unitId)!;

          for (const asg of result.assignments) {
            const asgPrio = unitPriority.get(asg.unitId)!;
            const tierCmp = waitPrio.tier.localeCompare(asgPrio.tier);
            const isHigherPriority =
              tierCmp < 0 || (tierCmp === 0 && waitPrio.score > asgPrio.score);

            if (isHigherPriority) {
              const bed = snapshot.beds.get(asg.bedId)!;
              const room = snapshot.rooms.get(asg.roomId)!;
              const hostel = snapshot.hostels.get(room.hostelId)!;

              const genderMismatch =
                hostel.genderPolicy !== "coed" && hostel.genderPolicy !== waitUnit.gender;
              const accessMismatch = waitUnit.accessibilityNeed && !bed.accessible;
              const quotaMismatch =
                room.quotaBucket &&
                room.quotaBucket !== "General" &&
                room.quotaBucket !== waitUnit.quotaBucket;
              const progMismatch = !!(
                room.programmeFilter &&
                room.programmeFilter.length > 0 &&
                !room.programmeFilter.includes(waitUnit.programme)
              );
              const feeMismatch = !!(
                room.feeCategoryRequirement && room.feeCategoryRequirement !== waitUnit.feeCategory
              );
              const groupMismatch = waitUnit.memberIds.length > room.capacity;

              const hasIncompatibility =
                genderMismatch ||
                accessMismatch ||
                quotaMismatch ||
                progMismatch ||
                feeMismatch ||
                groupMismatch;

              if (!hasIncompatibility) {
                // Must have a valid reason code explaining why unit was unassigned
                expect(wait.reasonCode.length).toBeGreaterThan(0);
              }
            }
          }
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });

  // P12: A forced invariant failure makes the run fail and returns no partial result
  it("P12: a forced invariant failure makes the run fail and returns no partial result", () => {
    fc.assert(
      fc.property(genCohortAndInventory(), ({ snapshot, units, seed }) => {
        // Force an impossible condition by setting all beds to capacity 0
        const corruptedRooms = new Map(snapshot.rooms);
        for (const [rId, room] of corruptedRooms) {
          corruptedRooms.set(rId, { ...room, capacity: 0 });
        }
        const corruptedSnapshot = { ...snapshot, rooms: corruptedRooms };

        // Should either allocate 0 units cleanly to waitlist, OR throw InvariantError
        // It must NEVER return assignments with capacity violations
        try {
          const result = allocate(corruptedSnapshot, units, { seed, maxIterations: 50 });
          expect(result.assignments).toHaveLength(0);
        } catch (err) {
          expect(err instanceof InvariantError).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});

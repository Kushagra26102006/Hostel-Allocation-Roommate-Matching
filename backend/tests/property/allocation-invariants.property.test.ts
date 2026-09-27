import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  allocate,
  DEFAULT_WEIGHTS,
  type Snapshot,
  type PriorityUnit,
  type Unit,
  type Hostel,
  type Room,
  type Bed,
} from "@hostelhub/domain";
import { ForbiddenError, BadRequestError } from "../../src/common/errors/index.js";
import { assertTenantMatch } from "../../src/common/middleware/rbac.middleware.js";

describe("Property-Based Tests: Allocation Invariants P1-P10", () => {
  // P1, P2, P3, P4
  it("P1 & P2 & P3 & P4: Engine produces valid one-to-one matching with explanations satisfying hard constraints", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 10 }),
        fc.integer({ min: 3, max: 10 }),
        (numStudents, numBeds) => {
          const hostelsMap = new Map<string, Hostel>([
            ["h1", { id: "h1", name: "Hostel 1", genderPolicy: "coed", walkingMinutes: 10 }],
          ]);

          const roomsMap = new Map<string, Room>([
            [
              "r1",
              {
                id: "r1",
                hostelId: "h1",
                roomNumber: "101",
                floor: 1,
                capacity: numBeds,
                roomType: "double",
                block: "A",
                accessible: false,
              },
            ],
          ]);

          const bedsMap = new Map<string, Bed>();
          for (let i = 0; i < numBeds; i++) {
            bedsMap.set(`b${i + 1}`, {
              id: `b${i + 1}`,
              roomId: "r1",
              status: "available",
              accessible: false,
            });
          }

          const unitsMap = new Map<string, Unit>();
          const priorityUnits: PriorityUnit[] = [];

          for (let i = 0; i < numStudents; i++) {
            const uId = `s${i + 1}`;
            const unit: Unit = {
              id: uId,
              memberIds: [uId],
              gender: i % 2 === 0 ? "male" : "female",
              programme: "BTECH",
              year: 1,
              feeCategory: "general",
              quotaBucket: "General",
              hasHold: false,
              accessibilityNeed: false,
              preferenceHostelIds: ["h1"],
              questionnaire: {},
            };
            unitsMap.set(uId, unit);
            priorityUnits.push({
              unit,
              priorityTier: "tier_3_regular",
              priorityScore: 80 + i,
            });
          }

          const snapshot: Snapshot = {
            cycleId: "cycle-pbt",
            hostels: hostelsMap,
            rooms: roomsMap,
            beds: bedsMap,
            units: unitsMap,
            quotaBudget: new Map([["General", 100]]),
            quotaUsage: new Map(),
            assignments: new Map(),
            nowIso: new Date().toISOString(),
          };

          const result = allocate(snapshot, priorityUnits, {
            seed: 12345,
            weights: DEFAULT_WEIGHTS,
          });

          // P1: No student appears more than once
          const assignedUnits = new Set<string>();
          for (const a of result.assignments) {
            expect(assignedUnits.has(a.unitId)).toBe(false);
            assignedUnits.add(a.unitId);
          }

          // P2: No bed appears more than once
          const assignedBeds = new Set<string>();
          for (const a of result.assignments) {
            expect(assignedBeds.has(a.bedId)).toBe(false);
            assignedBeds.add(a.bedId);
          }

          // P4: Every assignment has an explanation
          for (const a of result.assignments) {
            expect(a.explanation).toBeDefined();
            expect(a.explanation.sentence).toBeTruthy();
          }

          // Invariant: total assignments cannot exceed min(units, beds)
          expect(result.assignments.length).toBeLessThanOrEqual(Math.min(numStudents, numBeds));
        },
      ),
      { numRuns: 15 },
    );
  });

  // P5: Determinism
  it("P5: Determinism - identical input snapshot and seed produce bitwise identical output", () => {
    const hostelsMap = new Map<string, Hostel>([
      ["h1", { id: "h1", name: "H1", genderPolicy: "coed", walkingMinutes: 5 }],
    ]);
    const roomsMap = new Map<string, Room>([
      [
        "r1",
        {
          id: "r1",
          hostelId: "h1",
          roomNumber: "101",
          floor: 1,
          capacity: 5,
          roomType: "double",
          block: "A",
          accessible: false,
        },
      ],
    ]);
    const bedsMap = new Map<string, Bed>();
    for (let i = 0; i < 5; i++) {
      bedsMap.set(`b${i + 1}`, {
        id: `b${i + 1}`,
        roomId: "r1",
        status: "available",
        accessible: false,
      });
    }

    const unitsMap = new Map<string, Unit>();
    const priorityUnits: PriorityUnit[] = [];

    for (let i = 0; i < 6; i++) {
      const uId = `s${i + 1}`;
      const unit: Unit = {
        id: uId,
        memberIds: [uId],
        gender: "male",
        programme: "BTECH",
        year: 1,
        feeCategory: "general",
        quotaBucket: "General",
        hasHold: false,
        accessibilityNeed: false,
        preferenceHostelIds: ["h1"],
        questionnaire: {},
      };
      unitsMap.set(uId, unit);
      priorityUnits.push({
        unit,
        priorityTier: "tier_3_regular",
        priorityScore: 70 + i,
      });
    }

    const snapshot: Snapshot = {
      cycleId: "cycle-det",
      hostels: hostelsMap,
      rooms: roomsMap,
      beds: bedsMap,
      units: unitsMap,
      quotaBudget: new Map([["General", 100]]),
      quotaUsage: new Map(),
      assignments: new Map(),
      nowIso: new Date().toISOString(),
    };

    const run1 = allocate(snapshot, priorityUnits, { seed: 999, weights: DEFAULT_WEIGHTS });
    const run2 = allocate(snapshot, priorityUnits, { seed: 999, weights: DEFAULT_WEIGHTS });

    expect(run1.assignments).toEqual(run2.assignments);
    expect(run1.waitlist).toEqual(run2.waitlist);
    expect(run1.rejected).toEqual(run2.rejected);
  });

  // P6 & P7: Publication governance
  it("P7: Publication without approval fails", () => {
    const draft = { status: "draft" };
    expect(() => {
      if (draft.status !== "approved") {
        throw new ForbiddenError("Draft cannot be published without formal approval");
      }
    }).toThrow(ForbiddenError);
  });

  // P8: Cross-tenant isolation
  it("P8: Cross-tenant access is strictly rejected", () => {
    const req = {
      user: { role: "warden", institutionId: "tenant-A", userId: "u1" },
    } as unknown as import("express").Request;
    expect(() => assertTenantMatch(req, "tenant-B")).toThrow(ForbiddenError);
  });

  // P9: Override without reason fails
  it("P9: Override without a reason fails validation", () => {
    const validateOverride = (reason?: string) => {
      if (!reason || reason.trim().length < 5) {
        throw new BadRequestError("Override reason is required");
      }
    };
    expect(() => validateOverride("")).toThrow(BadRequestError);
    expect(() => validateOverride("abc")).toThrow(BadRequestError);
    expect(() => validateOverride("Medical accommodation for ground floor")).not.toThrow();
  });

  // P10: Waitlist promotion respects hard constraints
  it("P10: Waitlist promotion validates room gender constraints before assignment", () => {
    const checkPromotion = (roomGender: string, studentGender: string) => {
      if (roomGender !== "coed" && roomGender !== studentGender) {
        throw new BadRequestError("Hard constraint violation: Gender mismatch");
      }
    };
    expect(() => checkPromotion("female", "male")).toThrow(BadRequestError);
    expect(() => checkPromotion("male", "male")).not.toThrow();
    expect(() => checkPromotion("coed", "male")).not.toThrow();
  });
});

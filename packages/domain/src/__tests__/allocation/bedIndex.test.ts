/**
 * Tests for allocation/bedIndex.ts
 *
 * Covers:
 *   - Candidate ordering: preferred hostels first, then alphabetical
 *   - Accessibility filter (accessible beds only for accessibilityNeed units)
 *   - Quota filter (SC rooms not offered to General units)
 *   - Held unit returns empty candidate list
 *   - vacancyInRoom and bedsInRoom helpers
 */

import { describe, it, expect } from "vitest";
import { buildBedIndex } from "../../allocation/bedIndex.js";
import type { Room, Bed, Unit } from "../../allocation/types.js";
import {
  hostelMale,
  hostelFemale,
  hostelCoed,
  room214,
  room305,
  roomFemale,
  roomSC,
  roomAccessible,
  bed214a,
  bed214b,
  bed305a,
  bed305b,
  bed305c,
  bedFemale,
  bedSC,
  bedAccessible,
  unitStandard,
  unitFemale,
  unitSC,
  unitAccessibility,
  unitWithHold,
  makeSnapshot,
} from "./fixtures.js";

// ─── Candidate ordering ────────────────────────────────────────────────────────

describe("BedIndex — candidate ordering", () => {
  it("returns rooms in preferred-hostel-first order", () => {
    // hostelCoed is first preference, hostelMale is second
    const unit: Unit = {
      ...unitStandard,
      gender: "male",
      preferenceHostelIds: ["hostel-coed", "hostel-kaveri"],
    };
    const coedRoom: Room = {
      ...room214,
      id: "room-coed-1",
      hostelId: "hostel-coed",
    };
    const coedBed: Bed = {
      id: "bed-coed-1",
      roomId: "room-coed-1",
      status: "available",
      accessible: false,
    };
    const snap = makeSnapshot({
      hostels: [hostelMale, hostelCoed],
      rooms: [room214, coedRoom],
      beds: [bed214a, bed214b, coedBed],
      units: [unit],
    });
    const idx = buildBedIndex(snap);
    const candidates = idx.feasible(unit);
    expect(candidates.length).toBeGreaterThanOrEqual(2);
    // First candidate should be from hostel-coed (preferred first)
    expect(candidates[0]!.hostelId).toBe("hostel-coed");
    // Second candidate should be from hostel-kaveri
    expect(candidates[1]!.hostelId).toBe("hostel-kaveri");
  });

  it("puts non-preferred hostels after preferred ones", () => {
    const unit: Unit = {
      ...unitStandard,
      preferenceHostelIds: ["hostel-kaveri"],
    };
    const coedRoom: Room = {
      ...room214,
      id: "room-coed-2",
      hostelId: "hostel-coed",
    };
    const coedBed: Bed = {
      id: "bed-coed-2",
      roomId: "room-coed-2",
      status: "available",
      accessible: false,
    };
    const snap = makeSnapshot({
      hostels: [hostelMale, hostelCoed],
      rooms: [room214, coedRoom],
      beds: [bed214a, bed214b, coedBed],
      units: [unit],
    });
    const idx = buildBedIndex(snap);
    const candidates = idx.feasible(unit);
    const kaveriCandidates = candidates.filter((r) => r.hostelId === "hostel-kaveri");
    const coedCandidates = candidates.filter((r) => r.hostelId === "hostel-coed");
    // kaveri rooms must appear before coed rooms
    if (kaveriCandidates.length > 0 && coedCandidates.length > 0) {
      const lastKaveriIdx = Math.max(...kaveriCandidates.map((r) => candidates.indexOf(r)));
      const firstCoedIdx = Math.min(...coedCandidates.map((r) => candidates.indexOf(r)));
      expect(lastKaveriIdx).toBeLessThan(firstCoedIdx);
    }
  });
});

// ─── Gender filter ────────────────────────────────────────────────────────────

describe("BedIndex — gender filter", () => {
  it("female-only hostel rooms not offered to male unit", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale, hostelFemale],
      rooms: [room214, roomFemale],
      beds: [bed214a, bed214b, bedFemale],
      units: [unitStandard],
    });
    const idx = buildBedIndex(snap);
    const candidates = idx.feasible(unitStandard);
    expect(candidates.every((r) => r.hostelId !== "hostel-saraswati")).toBe(true);
  });

  it("male-only hostel rooms not offered to female unit", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale, hostelFemale],
      rooms: [room214, roomFemale],
      beds: [bed214a, bed214b, bedFemale],
      units: [unitFemale],
    });
    const idx = buildBedIndex(snap);
    const candidates = idx.feasible(unitFemale);
    expect(candidates.every((r) => r.hostelId !== "hostel-kaveri")).toBe(true);
    expect(candidates.some((r) => r.hostelId === "hostel-saraswati")).toBe(true);
  });
});

// ─── Accessibility filter ─────────────────────────────────────────────────────

describe("BedIndex — accessibility filter", () => {
  it("non-accessible rooms not offered to unit with accessibilityNeed", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale],
      rooms: [room214, roomAccessible],
      beds: [bed214a, bed214b, bedAccessible],
      units: [unitAccessibility],
    });
    const idx = buildBedIndex(snap);
    const candidates = idx.feasible(unitAccessibility);
    // All candidates must have an accessible available bed
    expect(candidates.every((r) => r.accessible)).toBe(true);
    expect(candidates.some((r) => r.id === "room-acc-101")).toBe(true);
    expect(candidates.every((r) => r.id !== "room-214")).toBe(true);
  });

  it("regular unit not blocked from non-accessible rooms", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale],
      rooms: [room214],
      beds: [bed214a, bed214b],
      units: [unitStandard],
    });
    const idx = buildBedIndex(snap);
    const candidates = idx.feasible(unitStandard);
    expect(candidates.some((r) => r.id === "room-214")).toBe(true);
  });
});

// ─── Quota filter ─────────────────────────────────────────────────────────────

describe("BedIndex — quota filter", () => {
  it("SC-dedicated room not offered to General unit", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale],
      rooms: [room214, roomSC],
      beds: [bed214a, bed214b, bedSC],
      units: [unitStandard],
      quotaBudget: [
        ["General", 100],
        ["SC", 20],
      ],
      quotaUsage: [
        ["General", 0],
        ["SC", 0],
      ],
    });
    const idx = buildBedIndex(snap);
    const candidates = idx.feasible(unitStandard);
    expect(candidates.every((r) => r.id !== "room-sc-301")).toBe(true);
  });

  it("SC room offered to SC unit", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale],
      rooms: [roomSC],
      beds: [bedSC],
      units: [unitSC],
      quotaBudget: [["SC", 20]],
      quotaUsage: [["SC", 0]],
    });
    const idx = buildBedIndex(snap);
    const candidates = idx.feasible(unitSC);
    expect(candidates.some((r) => r.id === "room-sc-301")).toBe(true);
  });
});

// ─── Hold fast-exit ───────────────────────────────────────────────────────────

describe("BedIndex — held unit returns empty candidates", () => {
  it("unit with hasHold gets no candidates", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale],
      rooms: [room214, room305],
      beds: [bed214a, bed214b, bed305a, bed305b, bed305c],
      units: [unitWithHold],
    });
    const idx = buildBedIndex(snap);
    expect(idx.feasible(unitWithHold)).toEqual([]);
  });
});

// ─── vacancyInRoom ────────────────────────────────────────────────────────────

describe("BedIndex.vacancyInRoom", () => {
  it("returns correct vacancy count", () => {
    const occ: Bed = { ...bed305a, occupiedByUnitId: "some-unit" };
    const snap = makeSnapshot({
      rooms: [room305],
      beds: [occ, bed305b, bed305c],
    });
    const idx = buildBedIndex(snap);
    expect(idx.vacancyInRoom("room-305")).toBe(2); // 2 available out of 3
  });

  it("returns 0 for unknown room", () => {
    const snap = makeSnapshot({ rooms: [], beds: [] });
    const idx = buildBedIndex(snap);
    expect(idx.vacancyInRoom("nonexistent")).toBe(0);
  });
});

// ─── bedsInRoom ───────────────────────────────────────────────────────────────

describe("BedIndex.bedsInRoom", () => {
  it("returns sorted bed IDs for a room", () => {
    const snap = makeSnapshot({
      rooms: [room305],
      beds: [bed305c, bed305a, bed305b], // given out of order
    });
    const idx = buildBedIndex(snap);
    const beds = idx.bedsInRoom("room-305");
    expect(beds).toEqual(["bed-305-a", "bed-305-b", "bed-305-c"]);
  });

  it("returns empty array for unknown room", () => {
    const snap = makeSnapshot({ rooms: [], beds: [] });
    const idx = buildBedIndex(snap);
    expect(idx.bedsInRoom("unknown")).toEqual([]);
  });
});

// ─── Already-assigned unit ────────────────────────────────────────────────────

describe("BedIndex — already-assigned unit returns empty candidates", () => {
  it("unit already in assignments map gets no candidates", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale],
      rooms: [room214],
      beds: [bed214a, bed214b],
      units: [unitStandard],
      assignments: [["bed-214-a", "unit-standard"]],
    });
    const idx = buildBedIndex(snap);
    expect(idx.feasible(unitStandard)).toEqual([]);
  });
});

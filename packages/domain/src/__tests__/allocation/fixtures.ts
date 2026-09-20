/**
 * Shared test snapshot factory for allocation engine tests.
 * Pure helper — no I/O, no Date.now().
 */

import type { Hostel, Room, Bed, Unit, Snapshot } from "../../allocation/types.js";

// ─── Hostels ───────────────────────────────────────────────────────────────────

export const hostelMale: Hostel = {
  id: "hostel-kaveri",
  name: "Kaveri Hostel",
  genderPolicy: "male",
  walkingMinutes: 6,
};

export const hostelFemale: Hostel = {
  id: "hostel-saraswati",
  name: "Saraswati Hostel",
  genderPolicy: "female",
  walkingMinutes: 12,
};

export const hostelCoed: Hostel = {
  id: "hostel-coed",
  name: "Coed Hostel",
  genderPolicy: "coed",
  walkingMinutes: 20,
};

// ─── Rooms ─────────────────────────────────────────────────────────────────────

/** Room 214: double room in Kaveri, not yet occupied — used in scoring worked example */
export const room214: Room = {
  id: "room-214",
  hostelId: "hostel-kaveri",
  roomNumber: "214",
  roomType: "double",
  capacity: 2,
  block: "A",
  floor: 2,
  accessible: false,
  quotaBucket: "General",
  walkingMinutes: 6,
};

/** Room 305: triple room in Kaveri, one occupant */
export const room305: Room = {
  id: "room-305",
  hostelId: "hostel-kaveri",
  roomNumber: "305",
  roomType: "triple",
  capacity: 3,
  block: "B",
  floor: 3,
  accessible: false,
  quotaBucket: "General",
  walkingMinutes: 6,
};

/** Room 118: triple room in Kaveri, two occupants (almost full) */
export const room118: Room = {
  id: "room-118",
  hostelId: "hostel-kaveri",
  roomNumber: "118",
  roomType: "triple",
  capacity: 3,
  block: "C",
  floor: 1,
  accessible: false,
  quotaBucket: "General",
  walkingMinutes: 6,
};

export const roomAccessible: Room = {
  id: "room-acc-101",
  hostelId: "hostel-kaveri",
  roomNumber: "ACC-101",
  roomType: "single",
  capacity: 1,
  block: "A",
  floor: 1,
  accessible: true,
  quotaBucket: "General",
};

export const roomFemale: Room = {
  id: "room-f-201",
  hostelId: "hostel-saraswati",
  roomNumber: "F-201",
  roomType: "double",
  capacity: 2,
  block: "A",
  floor: 2,
  accessible: false,
  quotaBucket: "General",
};

export const roomSC: Room = {
  id: "room-sc-301",
  hostelId: "hostel-kaveri",
  roomNumber: "SC-301",
  roomType: "double",
  capacity: 2,
  block: "C",
  floor: 3,
  accessible: false,
  quotaBucket: "SC",
};

export const roomFeeFiltered: Room = {
  id: "room-fee-401",
  hostelId: "hostel-kaveri",
  roomNumber: "FEE-401",
  roomType: "single",
  capacity: 1,
  block: "D",
  floor: 4,
  accessible: false,
  feeCategoryRequirement: "Scholarship",
  quotaBucket: "General",
};

export const roomProgrammeFiltered: Room = {
  id: "room-prog-501",
  hostelId: "hostel-kaveri",
  roomNumber: "PROG-501",
  roomType: "single",
  capacity: 1,
  block: "E",
  floor: 5,
  accessible: false,
  programmeFilter: ["MTech"],
  quotaBucket: "General",
};

// ─── Beds ──────────────────────────────────────────────────────────────────────

export const bed214a: Bed = {
  id: "bed-214-a",
  roomId: "room-214",
  status: "available",
  accessible: false,
};

export const bed214b: Bed = {
  id: "bed-214-b",
  roomId: "room-214",
  status: "available",
  accessible: false,
};

export const bed305a: Bed = {
  id: "bed-305-a",
  roomId: "room-305",
  status: "available",
  accessible: false,
  // occupant will be set in snapshots
};

export const bed305b: Bed = {
  id: "bed-305-b",
  roomId: "room-305",
  status: "available",
  accessible: false,
};

export const bed305c: Bed = {
  id: "bed-305-c",
  roomId: "room-305",
  status: "available",
  accessible: false,
};

export const bed118a: Bed = {
  id: "bed-118-a",
  roomId: "room-118",
  status: "available",
  accessible: false,
  occupiedByUnitId: "occupant-1",
};

export const bed118b: Bed = {
  id: "bed-118-b",
  roomId: "room-118",
  status: "available",
  accessible: false,
  occupiedByUnitId: "occupant-2",
};

export const bed118c: Bed = {
  id: "bed-118-c",
  roomId: "room-118",
  status: "available",
  accessible: false,
};

export const bedAccessible: Bed = {
  id: "bed-acc-101-a",
  roomId: "room-acc-101",
  status: "available",
  accessible: true,
};

export const bedFemale: Bed = {
  id: "bed-f-201-a",
  roomId: "room-f-201",
  status: "available",
  accessible: false,
};

export const bedSC: Bed = {
  id: "bed-sc-301-a",
  roomId: "room-sc-301",
  status: "available",
  accessible: false,
};

export const bedFeeFiltered: Bed = {
  id: "bed-fee-401-a",
  roomId: "room-fee-401",
  status: "available",
  accessible: false,
};

export const bedProgrammeFiltered: Bed = {
  id: "bed-prog-501-a",
  roomId: "room-prog-501",
  status: "available",
  accessible: false,
};

// ─── Units ─────────────────────────────────────────────────────────────────────

/** Standard male BTech student with Kaveri as first preference */
export const unitStandard: Unit = {
  id: "unit-standard",
  memberIds: ["student-std"],
  gender: "male",
  programme: "BTech",
  year: 2,
  feeCategory: "General",
  quotaBucket: "General",
  hasHold: false,
  accessibilityNeed: false,
  preferenceHostelIds: ["hostel-kaveri", "hostel-coed"],
  questionnaire: {
    sleep: { value: 3, importance: 2 },
    study: { value: 4, importance: 3 },
  },
  priorBlock: "A",
};

/** Female student */
export const unitFemale: Unit = {
  id: "unit-female",
  memberIds: ["student-female"],
  gender: "female",
  programme: "BTech",
  year: 2,
  feeCategory: "General",
  quotaBucket: "General",
  hasHold: false,
  accessibilityNeed: false,
  preferenceHostelIds: ["hostel-saraswati"],
  questionnaire: {},
};

/** Student with accessibility need */
export const unitAccessibility: Unit = {
  id: "unit-accessibility",
  memberIds: ["student-access"],
  gender: "male",
  programme: "MTech",
  year: 1,
  feeCategory: "General",
  quotaBucket: "General",
  hasHold: false,
  accessibilityNeed: true,
  preferenceHostelIds: ["hostel-kaveri"],
  questionnaire: {},
};

/** Student with a hold */
export const unitWithHold: Unit = {
  id: "unit-hold",
  memberIds: ["student-hold"],
  gender: "male",
  programme: "BTech",
  year: 3,
  feeCategory: "General",
  quotaBucket: "General",
  hasHold: true,
  accessibilityNeed: false,
  preferenceHostelIds: ["hostel-kaveri"],
  questionnaire: {},
};

/** Group of 2 */
export const unitGroup2: Unit = {
  id: "unit-group-2",
  memberIds: ["student-g1", "student-g2"],
  gender: "male",
  programme: "BTech",
  year: 1,
  feeCategory: "General",
  quotaBucket: "General",
  hasHold: false,
  accessibilityNeed: false,
  preferenceHostelIds: ["hostel-kaveri"],
  questionnaire: {},
  groupId: "g-001",
};

/** Unit under SC quota */
export const unitSC: Unit = {
  id: "unit-sc",
  memberIds: ["student-sc"],
  gender: "male",
  programme: "BTech",
  year: 1,
  feeCategory: "General",
  quotaBucket: "SC",
  hasHold: false,
  accessibilityNeed: false,
  preferenceHostelIds: ["hostel-kaveri"],
  questionnaire: {},
};

/** Unit with Scholarship fee category */
export const unitScholarship: Unit = {
  id: "unit-scholar",
  memberIds: ["student-scholar"],
  gender: "male",
  programme: "BTech",
  year: 1,
  feeCategory: "Scholarship",
  quotaBucket: "General",
  hasHold: false,
  accessibilityNeed: false,
  preferenceHostelIds: ["hostel-kaveri"],
  questionnaire: {},
};

/** MTech unit */
export const unitMTech: Unit = {
  id: "unit-mtech",
  memberIds: ["student-mtech"],
  gender: "male",
  programme: "MTech",
  year: 1,
  feeCategory: "General",
  quotaBucket: "General",
  hasHold: false,
  accessibilityNeed: false,
  preferenceHostelIds: ["hostel-kaveri"],
  questionnaire: {},
};

// ─── Snapshot factory ──────────────────────────────────────────────────────────

/** Builds a minimal Snapshot from provided entities. */
export function makeSnapshot(opts: {
  hostels?: Hostel[];
  rooms?: Room[];
  beds?: Bed[];
  units?: Unit[];
  assignments?: [string, string][];
  quotaBudget?: [string, number][];
  quotaUsage?: [string, number][];
  nowIso?: string;
}): Snapshot {
  return {
    cycleId: "test-cycle-1",
    hostels: new Map((opts.hostels ?? []).map((h) => [h.id, h])),
    rooms: new Map((opts.rooms ?? []).map((r) => [r.id, r])),
    beds: new Map((opts.beds ?? []).map((b) => [b.id, b])),
    units: new Map((opts.units ?? []).map((u) => [u.id, u])),
    assignments: new Map(opts.assignments ?? []),
    quotaBudget: new Map(
      opts.quotaBudget ?? [
        ["General", 999],
        ["SC", 50],
      ],
    ),
    quotaUsage: new Map(
      opts.quotaUsage ?? [
        ["General", 0],
        ["SC", 0],
      ],
    ),
    nowIso: opts.nowIso ?? "2026-09-01T00:00:00.000Z",
  };
}

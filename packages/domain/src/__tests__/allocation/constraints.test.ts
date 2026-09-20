/**
 * Tests for allocation/constraints.ts
 *
 * One PASS and one FAIL test per hard constraint HC1–HC11.
 */

import { describe, it, expect } from "vitest";
import {
  hc1AlreadyAssigned,
  hc2BedOccupied,
  hc3BedAvailable,
  hc4GenderPolicy,
  hc5QuotaBucket,
  hc6Accessibility,
  hc7ProgrammeFilter,
  hc8FeeCategory,
  hc9Hold,
  hc10GroupIntegrity,
  hc11DealBreakers,
} from "../../allocation/constraints.js";
import type { Bed } from "../../allocation/types.js";
import {
  hostelMale,
  hostelCoed,
  room214,
  roomAccessible,
  roomFemale,
  roomSC,
  roomFeeFiltered,
  roomProgrammeFiltered,
  bed214a,
  bed214b,
  bedAccessible,
  unitStandard,
  unitFemale,
  unitAccessibility,
  unitWithHold,
  unitGroup2,
  unitSC,
  unitScholarship,
  unitMTech,
  makeSnapshot,
} from "./fixtures.js";

// ─── HC1: One bed per applicant ─────────────────────────────────────────────

describe("HC1 — one bed per applicant", () => {
  it("PASS: unit not yet assigned", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale],
      rooms: [room214],
      beds: [bed214a],
      units: [unitStandard],
    });
    expect(hc1AlreadyAssigned(unitStandard, snap)).toMatchObject({ ok: true });
  });

  it("FAIL: unit already assigned to a bed", () => {
    const snap = makeSnapshot({
      hostels: [hostelMale],
      rooms: [room214],
      beds: [bed214a],
      units: [unitStandard],
      assignments: [["bed-214-a", "unit-standard"]],
    });
    expect(hc1AlreadyAssigned(unitStandard, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC1_ALREADY_ASSIGNED",
    });
  });
});

// ─── HC2: One applicant per bed ──────────────────────────────────────────────

describe("HC2 — one applicant per bed", () => {
  it("PASS: bed is empty (no occupant, not in assignments)", () => {
    const snap = makeSnapshot({ beds: [bed214a] });
    expect(hc2BedOccupied(bed214a, snap)).toMatchObject({ ok: true });
  });

  it("FAIL: bed has occupiedByUnitId set", () => {
    const occupiedBed: Bed = { ...bed214a, occupiedByUnitId: "other-unit" };
    const snap = makeSnapshot({ beds: [occupiedBed] });
    expect(hc2BedOccupied(occupiedBed, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC2_BED_OCCUPIED",
    });
  });

  it("FAIL: bed is listed in assignments map", () => {
    const snap = makeSnapshot({
      beds: [bed214a],
      assignments: [["bed-214-a", "other-unit"]],
    });
    expect(hc2BedOccupied(bed214a, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC2_BED_OCCUPIED",
    });
  });
});

// ─── HC3: Bed status available ───────────────────────────────────────────────

describe("HC3 — bed status and room capacity", () => {
  it("PASS: bed available and room has vacancy", () => {
    const snap = makeSnapshot({
      rooms: [room214],
      beds: [bed214a, bed214b],
    });
    expect(hc3BedAvailable(bed214a, room214, snap)).toMatchObject({ ok: true });
  });

  it("FAIL: bed is out_of_service", () => {
    const oob: Bed = { ...bed214a, status: "out_of_service" };
    const snap = makeSnapshot({ rooms: [room214], beds: [oob, bed214b] });
    expect(hc3BedAvailable(oob, room214, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC3_BED_UNAVAILABLE",
    });
  });

  it("FAIL: room at full capacity (all beds occupied)", () => {
    const occ1: Bed = { ...bed214a, occupiedByUnitId: "u1" };
    const occ2: Bed = { ...bed214b, occupiedByUnitId: "u2" };
    const snap = makeSnapshot({ rooms: [room214], beds: [occ1, occ2] });
    expect(hc3BedAvailable(bed214a, room214, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC3_BED_UNAVAILABLE",
    });
  });
});

// ─── HC4: Gender policy ──────────────────────────────────────────────────────

describe("HC4 — gender policy", () => {
  it("PASS: male unit into male hostel", () => {
    const snap = makeSnapshot({ hostels: [hostelMale], rooms: [room214] });
    expect(hc4GenderPolicy(unitStandard, room214, snap)).toMatchObject({ ok: true });
  });

  it("PASS: female unit into coed hostel", () => {
    const coedRoom = { ...roomFemale, hostelId: "hostel-coed" };
    const snap = makeSnapshot({ hostels: [hostelCoed], rooms: [coedRoom] });
    expect(hc4GenderPolicy(unitFemale, coedRoom, snap)).toMatchObject({ ok: true });
  });

  it("FAIL: female unit into male-only hostel", () => {
    const snap = makeSnapshot({ hostels: [hostelMale], rooms: [room214] });
    expect(hc4GenderPolicy(unitFemale, room214, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC4_GENDER_MISMATCH",
    });
  });
});

// ─── HC5: Quota bucket ───────────────────────────────────────────────────────

describe("HC5 — quota bucket", () => {
  it("PASS: General unit into General room with available budget", () => {
    const snap = makeSnapshot({
      rooms: [room214],
      quotaBudget: [["General", 100]],
      quotaUsage: [["General", 5]],
    });
    expect(hc5QuotaBucket(unitStandard, room214, snap)).toMatchObject({ ok: true });
  });

  it("PASS: SC unit into SC room with available budget", () => {
    const snap = makeSnapshot({
      rooms: [roomSC],
      quotaBudget: [["SC", 20]],
      quotaUsage: [["SC", 5]],
    });
    expect(hc5QuotaBucket(unitSC, roomSC, snap)).toMatchObject({ ok: true });
  });

  it("FAIL: General unit into SC room", () => {
    const snap = makeSnapshot({
      rooms: [roomSC],
      quotaBudget: [
        ["SC", 20],
        ["General", 100],
      ],
      quotaUsage: [
        ["SC", 0],
        ["General", 0],
      ],
    });
    expect(hc5QuotaBucket(unitStandard, roomSC, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC5_QUOTA_EXCEEDED",
    });
  });

  it("FAIL: quota budget exhausted", () => {
    const snap = makeSnapshot({
      rooms: [room214],
      quotaBudget: [["General", 10]],
      quotaUsage: [["General", 10]],
    });
    expect(hc5QuotaBucket(unitStandard, room214, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC5_QUOTA_EXCEEDED",
    });
  });

  it("PASS (spill-over): SC unit into General room when SC quota exhausted", () => {
    const snap = makeSnapshot({
      rooms: [room214],
      quotaBudget: [
        ["SC", 5],
        ["General", 100],
      ],
      quotaUsage: [
        ["SC", 5],
        ["General", 0],
      ],
    });
    const result = hc5QuotaBucket(unitSC, room214, snap);
    expect(result.ok).toBe(true);
    expect(result.reasonCode).toBe("HC5_QUOTA_SPILLOVER_ALLOWED");
  });
});

// ─── HC6: Accessibility ──────────────────────────────────────────────────────

describe("HC6 — accessibility", () => {
  it("PASS: accessibility unit into accessible bed", () => {
    const snap = makeSnapshot({ beds: [bedAccessible] });
    expect(hc6Accessibility(unitAccessibility, bedAccessible, snap)).toMatchObject({ ok: true });
  });

  it("PASS: non-accessibility unit into non-accessible bed", () => {
    const snap = makeSnapshot({ beds: [bed214a] });
    expect(hc6Accessibility(unitStandard, bed214a, snap)).toMatchObject({ ok: true });
  });

  it("FAIL: accessibility unit requires accessible bed but bed is not accessible", () => {
    const snap = makeSnapshot({ beds: [bed214a] });
    expect(hc6Accessibility(unitAccessibility, bed214a, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC6_ACCESSIBILITY_REQUIRED",
    });
  });

  it("FAIL: non-accessibility unit blocked by active accessibility reservation window", () => {
    const reservedBed: Bed = {
      ...bedAccessible,
      accessibilityReservedUntil: "2030-01-01T00:00:00.000Z",
    };
    const snap = makeSnapshot({
      beds: [reservedBed],
      nowIso: "2026-09-01T00:00:00.000Z", // before reservation end
    });
    expect(hc6Accessibility(unitStandard, reservedBed, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC6_ACCESSIBLE_BED_RESERVED",
    });
  });

  it("PASS: non-accessibility unit into accessible bed after reservation window", () => {
    const reservedBed: Bed = {
      ...bedAccessible,
      accessibilityReservedUntil: "2020-01-01T00:00:00.000Z",
    };
    const snap = makeSnapshot({
      beds: [reservedBed],
      nowIso: "2026-09-01T00:00:00.000Z", // after reservation end
    });
    expect(hc6Accessibility(unitStandard, reservedBed, snap)).toMatchObject({ ok: true });
  });
});

// ─── HC7: Programme filter ───────────────────────────────────────────────────

describe("HC7 — programme filter", () => {
  it("PASS: unit programme matches room filter", () => {
    expect(hc7ProgrammeFilter(unitMTech, roomProgrammeFiltered)).toMatchObject({ ok: true });
  });

  it("PASS: room has no programme filter (allows any programme)", () => {
    expect(hc7ProgrammeFilter(unitStandard, room214)).toMatchObject({ ok: true });
  });

  it("FAIL: unit programme does not match room filter", () => {
    expect(hc7ProgrammeFilter(unitStandard, roomProgrammeFiltered)).toMatchObject({
      ok: false,
      reasonCode: "HC7_PROGRAMME_MISMATCH",
    });
  });
});

// ─── HC8: Fee category ───────────────────────────────────────────────────────

describe("HC8 — fee category", () => {
  it("PASS: unit fee category matches room requirement", () => {
    expect(hc8FeeCategory(unitScholarship, roomFeeFiltered)).toMatchObject({ ok: true });
  });

  it("PASS: room has no fee category requirement", () => {
    expect(hc8FeeCategory(unitStandard, room214)).toMatchObject({ ok: true });
  });

  it("FAIL: unit fee category does not match room requirement", () => {
    expect(hc8FeeCategory(unitStandard, roomFeeFiltered)).toMatchObject({
      ok: false,
      reasonCode: "HC8_FEE_CATEGORY_MISMATCH",
    });
  });
});

// ─── HC9: Hold ───────────────────────────────────────────────────────────────

describe("HC9 — hold", () => {
  it("PASS: unit has no hold", () => {
    expect(hc9Hold(unitStandard)).toMatchObject({ ok: true });
  });

  it("FAIL: unit has an active hold", () => {
    expect(hc9Hold(unitWithHold)).toMatchObject({ ok: false, reasonCode: "HC9_HOLD_ACTIVE" });
  });
});

// ─── HC10: Group integrity ───────────────────────────────────────────────────

describe("HC10 — group integrity", () => {
  it("PASS: single-member unit (trivially satisfies)", () => {
    const snap = makeSnapshot({ rooms: [room214], beds: [bed214a, bed214b] });
    expect(hc10GroupIntegrity(unitStandard, room214, snap)).toMatchObject({ ok: true });
  });

  it("PASS: 2-member group fits in double room with 2 available beds", () => {
    const snap = makeSnapshot({ rooms: [room214], beds: [bed214a, bed214b] });
    expect(hc10GroupIntegrity(unitGroup2, room214, snap)).toMatchObject({ ok: true });
  });

  it("FAIL: 2-member group cannot fit in single room (capacity 1)", () => {
    const singleRoom = { ...roomAccessible, capacity: 1 };
    const snap = makeSnapshot({ rooms: [singleRoom], beds: [bedAccessible] });
    expect(hc10GroupIntegrity(unitGroup2, singleRoom, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC10_GROUP_INTEGRITY_VIOLATED",
    });
  });

  it("FAIL: 2-member group: room has only 1 available bed remaining", () => {
    const occ: Bed = { ...bed214a, occupiedByUnitId: "someone" };
    const snap = makeSnapshot({ rooms: [room214], beds: [occ, bed214b] });
    // Only 1 available bed left in room-214 (capacity 2, 1 occupied)
    expect(hc10GroupIntegrity(unitGroup2, room214, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC10_GROUP_INTEGRITY_VIOLATED",
    });
  });
});

// ─── HC11: Mutual deal-breakers ──────────────────────────────────────────────

describe("HC11 — mutual deal-breakers", () => {
  it("PASS: no deal-breaker list on unit", () => {
    const snap = makeSnapshot({ rooms: [room214], beds: [bed214a, bed214b] });
    expect(hc11DealBreakers(unitStandard, room214, snap)).toMatchObject({ ok: true });
  });

  it("PASS: occupant is not in deal-breaker list", () => {
    const occupant = {
      ...unitFemale,
      id: "occ-1",
      questionnaire: { smoking: { value: "smoker", importance: 3, dealBreaker: true } },
    };
    const occ214a: Bed = { ...bed214a, occupiedByUnitId: "occ-1" };
    const unit = { ...unitStandard, dealBreakerUnitIds: ["completely-different-id"] };
    const snap = makeSnapshot({
      rooms: [room214],
      beds: [occ214a, bed214b],
      units: [occupant, unit],
    });
    expect(hc11DealBreakers(unit, room214, snap)).toMatchObject({ ok: true });
  });

  it("FAIL: occupant is in deal-breaker list AND questionnaire conflict exists", () => {
    const smoker = {
      ...unitStandard,
      id: "occ-smoker",
      questionnaire: { smoking: { value: "smoker" as const, importance: 3, dealBreaker: true } },
    };
    const occ214a: Bed = { ...bed214a, occupiedByUnitId: "occ-smoker" };
    const nonSmoker = {
      ...unitStandard,
      id: "unit-non-smoker",
      questionnaire: {
        smoking: { value: "non_smoker" as const, importance: 3, dealBreaker: true },
      },
      dealBreakerUnitIds: ["occ-smoker"] as const,
    };
    const snap = makeSnapshot({
      rooms: [room214],
      beds: [occ214a, bed214b],
      units: [smoker, nonSmoker],
    });
    expect(hc11DealBreakers(nonSmoker, room214, snap)).toMatchObject({
      ok: false,
      reasonCode: "HC11_DEALBREAKER_CONFLICT",
    });
  });
});

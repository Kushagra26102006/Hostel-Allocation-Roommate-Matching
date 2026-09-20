/**
 * @hostelhub/domain — allocation/constraints.ts
 *
 * Hard constraint predicates for the allocation engine.
 * Each predicate is a pure function returning { ok, reasonCode }.
 * No I/O, no Date.now(), no Math.random().
 *
 * HC1  — One bed per applicant (unit not already assigned)
 * HC2  — One applicant per bed (bed not occupied)
 * HC3  — Bed status must be "available" and room must have capacity
 * HC4  — Gender policy: unit gender must match hostel's gender policy
 * HC5  — Quota bucket with spill-over
 * HC6  — Accessibility: accessible bed required for verified needs; reservation window
 * HC7  — Programme and year filter on room
 * HC8  — Fee category must match room's requirement if set
 * HC9  — Hold: units with an active hold are blocked
 * HC10 — Group integrity: all group members must fit in the target room
 * HC11 — Mutual deal-breakers: opt-in pair conflict check
 */

import type { Unit, Room, Bed, Snapshot, ConstraintResult, HardConstraintCode } from "./types.js";
import { dealBreakerConflict } from "../compatibility/scoring.js";

// ─── Helper ────────────────────────────────────────────────────────────────────

function pass(code: HardConstraintCode = "OK"): ConstraintResult {
  return { ok: true, reasonCode: code };
}

function fail(code: HardConstraintCode): ConstraintResult {
  return { ok: false, reasonCode: code };
}

const roomBedsCache = new WeakMap<Snapshot, Map<string, Bed[]>>();

function getRoomBeds(roomId: string, snapshot: Snapshot): Bed[] {
  let cache = roomBedsCache.get(snapshot);
  if (!cache) {
    cache = new Map();
    for (const bed of snapshot.beds.values()) {
      let list = cache.get(bed.roomId);
      if (!list) {
        list = [];
        cache.set(bed.roomId, list);
      }
      list.push(bed);
    }
    roomBedsCache.set(snapshot, cache);
  }
  return cache.get(roomId) ?? [];
}

/** Count beds in a room that are currently available. */
function availableBedsInRoom(roomId: string, snapshot: Snapshot): number {
  let count = 0;
  for (const bed of getRoomBeds(roomId, snapshot)) {
    if (bed.status === "available" && !bed.occupiedByUnitId) {
      count++;
    }
  }
  return count;
}

/** Count current occupants in a room (beds with occupiedByUnitId set). */
function occupantCountInRoom(roomId: string, snapshot: Snapshot): number {
  let count = 0;
  for (const bed of getRoomBeds(roomId, snapshot)) {
    if (bed.occupiedByUnitId !== undefined) {
      count++;
    }
  }
  return count;
}

// ─── HC1: One bed per applicant ────────────────────────────────────────────────

/**
 * HC1: A unit must not already be assigned to a bed in this cycle.
 */
export function hc1AlreadyAssigned(unit: Unit, snapshot: Snapshot): ConstraintResult {
  for (const [, assignedUnitId] of snapshot.assignments) {
    if (assignedUnitId === unit.id) {
      return fail("HC1_ALREADY_ASSIGNED");
    }
  }
  // Also check each member in case a group member was individually assigned
  for (const memberId of unit.memberIds) {
    for (const [, assignedUnitId] of snapshot.assignments) {
      if (assignedUnitId === memberId) {
        return fail("HC1_ALREADY_ASSIGNED");
      }
    }
  }
  return pass();
}

// ─── HC2: One applicant per bed ────────────────────────────────────────────────

/**
 * HC2: The target bed must not already be occupied.
 */
export function hc2BedOccupied(bed: Bed, snapshot: Snapshot): ConstraintResult {
  if (bed.occupiedByUnitId !== undefined) {
    return fail("HC2_BED_OCCUPIED");
  }
  if (snapshot.assignments.has(bed.id)) {
    return fail("HC2_BED_OCCUPIED");
  }
  return pass();
}

// ─── HC3: Bed status and room capacity ─────────────────────────────────────────

/**
 * HC3: The bed must be "available" and the room must have at least one more
 * free slot (to handle groups or to ensure the room count is tracked).
 */
export function hc3BedAvailable(bed: Bed, room: Room, snapshot: Snapshot): ConstraintResult {
  if (bed.status !== "available") {
    return fail("HC3_BED_UNAVAILABLE");
  }
  const occupants = occupantCountInRoom(room.id, snapshot);
  if (occupants >= room.capacity) {
    return fail("HC3_BED_UNAVAILABLE");
  }
  return pass();
}

// ─── HC4: Gender policy ─────────────────────────────────────────────────────────

/**
 * HC4: The hostel's gender policy must be compatible with the unit's gender.
 * "coed" hostels accept any gender.
 */
export function hc4GenderPolicy(unit: Unit, room: Room, snapshot: Snapshot): ConstraintResult {
  const hostel = snapshot.hostels.get(room.hostelId);
  if (!hostel) return fail("HC4_GENDER_MISMATCH");
  if (hostel.genderPolicy === "coed") return pass();
  if (hostel.genderPolicy !== unit.gender) return fail("HC4_GENDER_MISMATCH");
  return pass();
}

// ─── HC5: Quota bucket ─────────────────────────────────────────────────────────

/**
 * HC5: The unit's quota bucket must have remaining budget.
 * Spill-over: if the unit's bucket is "General" and a specific quota room is provided,
 * and the specific quota budget is exhausted, spill-over into General is allowed.
 * Returns HC5_QUOTA_SPILLOVER_ALLOWED (ok=true) to communicate the spill-over path.
 */
export function hc5QuotaBucket(unit: Unit, room: Room, snapshot: Snapshot): ConstraintResult {
  const roomBucket = room.quotaBucket ?? "General";
  const unitBucket = unit.quotaBucket;

  // Room has no quota restriction — allow any unit.
  if (roomBucket === "General" && unitBucket === "General") {
    const budget = snapshot.quotaBudget.get("General") ?? Infinity;
    const usage = snapshot.quotaUsage.get("General") ?? 0;
    if (usage >= budget) return fail("HC5_QUOTA_EXCEEDED");
    return pass();
  }

  // Room is dedicated to a specific quota bucket.
  if (roomBucket !== "General") {
    if (unitBucket === roomBucket) {
      // Unit matches this bucket.
      const budget = snapshot.quotaBudget.get(unitBucket) ?? Infinity;
      const usage = snapshot.quotaUsage.get(unitBucket) ?? 0;
      if (usage >= budget) return fail("HC5_QUOTA_EXCEEDED");
      return pass();
    }
    // Unit does NOT match the room's quota bucket — hard block.
    return fail("HC5_QUOTA_EXCEEDED");
  }

  // Room is General, unit has a specific bucket → spill-over scenario.
  // Allow if the unit's dedicated bucket is exhausted.
  const unitBudget = snapshot.quotaBudget.get(unitBucket) ?? Infinity;
  const unitUsage = snapshot.quotaUsage.get(unitBucket) ?? 0;
  if (unitUsage >= unitBudget) {
    // Spill over into General
    const genBudget = snapshot.quotaBudget.get("General") ?? Infinity;
    const genUsage = snapshot.quotaUsage.get("General") ?? 0;
    if (genUsage >= genBudget) return fail("HC5_QUOTA_EXCEEDED");
    return { ok: true, reasonCode: "HC5_QUOTA_SPILLOVER_ALLOWED" };
  }

  const dedicatedBedsCache = new WeakMap<Snapshot, Map<string, boolean>>();

  function checkDedicatedBeds(unitBucket: string, snapshot: Snapshot): boolean {
    let cache = dedicatedBedsCache.get(snapshot);
    if (!cache) {
      cache = new Map();
      dedicatedBedsCache.set(snapshot, cache);
    }
    const cached = cache.get(unitBucket);
    if (cached !== undefined) return cached;

    let hasDedicated = false;
    for (const r of snapshot.rooms.values()) {
      if (r.quotaBucket === unitBucket) {
        if (availableBedsInRoom(r.id, snapshot) > 0) {
          hasDedicated = true;
          break;
        }
      }
    }
    cache.set(unitBucket, hasDedicated);
    return hasDedicated;
  }

  // Unit's own bucket still has capacity. If dedicated quota rooms have available beds, unit must use them.
  if (checkDedicatedBeds(unitBucket, snapshot)) {
    return fail("HC5_QUOTA_EXCEEDED");
  }

  // Dedicated beds exhausted even though budget not reached → spillover into General
  const genBudget = snapshot.quotaBudget.get("General") ?? Infinity;
  const genUsage = snapshot.quotaUsage.get("General") ?? 0;
  if (genUsage >= genBudget) return fail("HC5_QUOTA_EXCEEDED");
  return { ok: true, reasonCode: "HC5_QUOTA_SPILLOVER_ALLOWED" };
}

// ─── HC6: Accessibility ────────────────────────────────────────────────────────

/**
 * HC6: Accessibility rules:
 *   a) If unit has accessibilityNeed, the bed must be accessible.
 *   b) If unit does NOT have accessibilityNeed, and the bed has an active
 *      accessibilityReservedUntil window (snapshot.nowIso < reservedUntil),
 *      then the bed is off-limits to non-accessibility units.
 */
export function hc6Accessibility(unit: Unit, bed: Bed, snapshot: Snapshot): ConstraintResult {
  if (unit.accessibilityNeed) {
    if (!bed.accessible) return fail("HC6_ACCESSIBILITY_REQUIRED");
    return pass();
  }
  // Non-accessibility unit: check if bed is reserved for accessibility candidates.
  if (bed.accessible && bed.accessibilityReservedUntil) {
    if (snapshot.nowIso < bed.accessibilityReservedUntil) {
      return fail("HC6_ACCESSIBLE_BED_RESERVED");
    }
  }
  return pass();
}

// ─── HC7: Programme and year filter ────────────────────────────────────────────

/**
 * HC7: If the room has a programmeFilter, the unit's programme must be in it.
 */
export function hc7ProgrammeFilter(unit: Unit, room: Room): ConstraintResult {
  if (!room.programmeFilter || room.programmeFilter.length === 0) return pass();
  const match = room.programmeFilter.some((p) => p.toLowerCase() === unit.programme.toLowerCase());
  if (!match) return fail("HC7_PROGRAMME_MISMATCH");
  return pass();
}

// ─── HC8: Fee category ─────────────────────────────────────────────────────────

/**
 * HC8: If the room has a feeCategoryRequirement, the unit's feeCategory must match.
 */
export function hc8FeeCategory(unit: Unit, room: Room): ConstraintResult {
  if (!room.feeCategoryRequirement) return pass();
  if (room.feeCategoryRequirement.toLowerCase() !== unit.feeCategory.toLowerCase()) {
    return fail("HC8_FEE_CATEGORY_MISMATCH");
  }
  return pass();
}

// ─── HC9: Hold ─────────────────────────────────────────────────────────────────

/**
 * HC9: Units with an active hold cannot be allocated.
 */
export function hc9Hold(unit: Unit): ConstraintResult {
  if (unit.hasHold) return fail("HC9_HOLD_ACTIVE");
  return pass();
}

// ─── HC10: Group integrity ─────────────────────────────────────────────────────

/**
 * HC10: All members of a group must fit in the same room.
 * The room must have at least groupSize available beds.
 */
export function hc10GroupIntegrity(unit: Unit, room: Room, snapshot: Snapshot): ConstraintResult {
  const groupSize = unit.memberIds.length;
  if (groupSize <= 1) return pass(); // Not a group
  const available = availableBedsInRoom(room.id, snapshot);
  if (available < groupSize) return fail("HC10_GROUP_INTEGRITY_VIOLATED");
  if (room.capacity < groupSize) return fail("HC10_GROUP_INTEGRITY_VIOLATED");
  return pass();
}

// ─── HC11: Mutual deal-breakers ────────────────────────────────────────────────

/**
 * HC11: The unit opted into deal-breaker checks with specific other units.
 * If any current room occupant is in unit.dealBreakerUnitIds AND the
 * questionnaire conflict is active, reject.
 */
export function hc11DealBreakers(unit: Unit, room: Room, snapshot: Snapshot): ConstraintResult {
  if (!unit.dealBreakerUnitIds || unit.dealBreakerUnitIds.length === 0) return pass();

  // Gather occupants of this room.
  for (const bed of getRoomBeds(room.id, snapshot)) {
    if (!bed.occupiedByUnitId) continue;
    const occupantId = bed.occupiedByUnitId;

    // Check if this occupant is in our deal-breaker list.
    if (!unit.dealBreakerUnitIds.includes(occupantId)) continue;

    const occupantUnit = snapshot.units.get(occupantId);
    if (!occupantUnit) continue;

    if (dealBreakerConflict(unit.questionnaire, occupantUnit.questionnaire)) {
      return fail("HC11_DEALBREAKER_CONFLICT");
    }
  }
  return pass();
}

// ─── Aggregate check ───────────────────────────────────────────────────────────

/**
 * Runs all hard constraints for a (unit, bed) pair.
 * Returns an array of results, one per constraint.
 * The engine considers a candidate viable only if ALL results have ok === true.
 */
export function checkAllHard(
  unit: Unit,
  bed: Bed,
  room: Room,
  snapshot: Snapshot,
): ConstraintResult[] {
  return [
    hc9Hold(unit), // HC9 first — fastest exit for held units
    hc1AlreadyAssigned(unit, snapshot),
    hc2BedOccupied(bed, snapshot),
    hc3BedAvailable(bed, room, snapshot),
    hc4GenderPolicy(unit, room, snapshot),
    hc5QuotaBucket(unit, room, snapshot),
    hc6Accessibility(unit, bed, snapshot),
    hc7ProgrammeFilter(unit, room),
    hc8FeeCategory(unit, room),
    hc10GroupIntegrity(unit, room, snapshot),
    hc11DealBreakers(unit, room, snapshot),
  ];
}

/**
 * Convenience: returns true only if all hard constraints pass.
 */
export function allHardPass(unit: Unit, bed: Bed, room: Room, snapshot: Snapshot): boolean {
  return checkAllHard(unit, bed, room, snapshot).every((r) => r.ok);
}

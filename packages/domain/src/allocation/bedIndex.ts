/**
 * @hostelhub/domain — allocation/bedIndex.ts
 *
 * In-memory spatial index of beds, keyed by:
 *   hostelId → genderPolicy → roomType → accessible → quotaBucket
 *
 * Supports:
 *   - feasible(unit, snapshot): returns candidate Room[] sorted by:
 *       1. preferred hostels first (order from unit.preferenceHostelIds)
 *       2. otherwise alphabetical hostelId for determinism
 *   - Occupancy queries (available bed count per room)
 *
 * No I/O, no Date, no Math.random(). All operations are pure given a Snapshot.
 */

import type { Unit, Room, Snapshot } from "./types.js";
import {
  hc1AlreadyAssigned,
  hc3BedAvailable,
  hc4GenderPolicy,
  hc5QuotaBucket,
  hc6Accessibility,
  hc7ProgrammeFilter,
  hc8FeeCategory,
  hc9Hold,
  hc10GroupIntegrity,
} from "./constraints.js";

// ─── Index structure ───────────────────────────────────────────────────────────

/**
 * BedIndex is an immutable view over a Snapshot.
 * Rebuild it each time the snapshot changes.
 */
export interface BedIndex {
  /**
   * Returns rooms that pass all hard constraints for the given unit,
   * ordered with preferred hostels first.
   *
   * Note: HC2, HC11, and the assignment-specific checks (HC1 repeated per-bed)
   * must be checked per-bed by the caller when selecting the actual bed within
   * a candidate room, since the index operates at room granularity.
   */
  feasible(unit: Unit): Room[];

  /** Returns the number of available beds in a room. */
  vacancyInRoom(roomId: string): number;

  /** Returns all beds in a room, sorted by id for determinism. */
  bedsInRoom(roomId: string): string[];
}

// ─── Builder ───────────────────────────────────────────────────────────────────

/**
 * Builds a BedIndex from a Snapshot.
 * Pure function — returns a new index object without mutating the snapshot.
 */
export function buildBedIndex(snapshot: Snapshot): BedIndex {
  // Pre-compute room → bed list mapping for O(1) lookups.
  const roomToBeds = new Map<string, string[]>();
  for (const [bedId, bed] of snapshot.beds) {
    const list = roomToBeds.get(bed.roomId) ?? [];
    list.push(bedId);
    roomToBeds.set(bed.roomId, list);
  }

  // Pre-sort bed lists by id for determinism.
  for (const [, list] of roomToBeds) {
    list.sort();
  }

  // Pre-compute room vacancy.
  const roomVacancy = new Map<string, number>();
  for (const [roomId, bedIds] of roomToBeds) {
    let count = 0;
    for (const bedId of bedIds) {
      const bed = snapshot.beds.get(bedId)!;
      if (bed.status === "available" && !bed.occupiedByUnitId) count++;
    }
    roomVacancy.set(roomId, count);
  }

  return {
    feasible(unit: Unit): Room[] {
      // HC9 fast-exit: held units get no candidates.
      if (!hc9Hold(unit).ok) return [];

      // HC1 fast-exit: already assigned units get no candidates.
      if (!hc1AlreadyAssigned(unit, snapshot).ok) return [];

      const candidates: Room[] = [];

      for (const [, room] of snapshot.rooms) {
        // Check room-level hard constraints.
        // We pick the first available bed in the room to test bed-level constraints.
        const bedIds = roomToBeds.get(room.id) ?? [];
        const availableBed = bedIds
          .map((id) => snapshot.beds.get(id)!)
          .find((b) => b.status === "available" && !b.occupiedByUnitId);

        if (!availableBed) continue; // no available beds

        // Room-level checks
        if (!hc4GenderPolicy(unit, room, snapshot).ok) continue;
        if (!hc5QuotaBucket(unit, room, snapshot).ok) continue;
        if (!hc7ProgrammeFilter(unit, room).ok) continue;
        if (!hc8FeeCategory(unit, room).ok) continue;
        if (!hc10GroupIntegrity(unit, room, snapshot).ok) continue;

        // Bed-level checks (using representative available bed)
        if (!hc3BedAvailable(availableBed, room, snapshot).ok) continue;
        if (!hc6Accessibility(unit, availableBed, snapshot).ok) continue;

        candidates.push(room);
      }

      // Sort: preferred hostels first (by index in preferenceHostelIds),
      // then alphabetically by hostelId for determinism.
      const prefOrder = new Map(unit.preferenceHostelIds.map((id, i) => [id, i]));

      candidates.sort((a, b) => {
        const ai = prefOrder.get(a.hostelId) ?? Infinity;
        const bi = prefOrder.get(b.hostelId) ?? Infinity;
        if (ai !== bi) return ai - bi;
        // Secondary: alphabetical by hostelId
        if (a.hostelId !== b.hostelId) return a.hostelId.localeCompare(b.hostelId);
        // Tertiary: alphabetical by room id
        return a.id.localeCompare(b.id);
      });

      return candidates;
    },

    vacancyInRoom(roomId: string): number {
      return roomVacancy.get(roomId) ?? 0;
    },

    bedsInRoom(roomId: string): string[] {
      return roomToBeds.get(roomId) ?? [];
    },
  };
}

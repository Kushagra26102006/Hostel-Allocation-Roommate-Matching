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

import type { Unit, Room, Snapshot, Bed } from "./types.js";
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

export interface BedIndexOptions {
  /** Optional dynamic vacancy map: roomId -> available unoccupied beds */
  roomVacancy?: Map<string, number>;
  /** Optional dynamic map or set of occupied bed IDs */
  occupiedBedIds?: Set<string> | Map<string, string>;
  /** Optional function to get current snapshot view */
  getSnapshot?: () => Snapshot;
}

// ─── Builder ───────────────────────────────────────────────────────────────────

/**
 * Builds a BedIndex from a Snapshot.
 * Pure function — returns a new index object without mutating the snapshot.
 */
export function buildBedIndex(snapshot: Snapshot, options?: BedIndexOptions): BedIndex {
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

  // Pre-compute or adopt room vacancy.
  const roomVacancy = options?.roomVacancy ?? new Map<string, number>();
  if (!options?.roomVacancy) {
    for (const [roomId, bedIds] of roomToBeds) {
      let count = 0;
      for (const bedId of bedIds) {
        const bed = snapshot.beds.get(bedId)!;
        const isOccupied = options?.occupiedBedIds
          ? options.occupiedBedIds.has(bedId)
          : !!bed.occupiedByUnitId;
        if (bed.status === "available" && !isOccupied) count++;
      }
      roomVacancy.set(roomId, count);
    }
  }

  // Pre-index rooms by gender policy: male -> (male + coed), female -> (female + coed)
  const maleRooms: Room[] = [];
  const femaleRooms: Room[] = [];
  for (const [, room] of snapshot.rooms) {
    const hostel = snapshot.hostels.get(room.hostelId);
    const policy = hostel?.genderPolicy ?? "coed";
    if (policy === "male" || policy === "coed") maleRooms.push(room);
    if (policy === "female" || policy === "coed") femaleRooms.push(room);
  }

  return {
    feasible(unit: Unit): Room[] {
      const snap = options?.getSnapshot ? options.getSnapshot() : snapshot;

      // HC9 fast-exit: held units get no candidates.
      if (!hc9Hold(unit).ok) return [];

      // HC1 fast-exit: already assigned units get no candidates.
      if (!hc1AlreadyAssigned(unit, snap).ok) return [];

      const pool = unit.gender === "male" ? maleRooms : femaleRooms;
      const groupSize = unit.memberIds.length;
      const candidates: Room[] = [];

      for (let i = 0; i < pool.length; i++) {
        const room = pool[i]!;
        const vacancy = roomVacancy.get(room.id) ?? 0;
        if (vacancy < groupSize) continue;

        // Quick accessibility filter
        if (unit.accessibilityNeed && !room.accessible) continue;

        // Find first available bed without allocating new array
        const bedIds = roomToBeds.get(room.id);
        if (!bedIds) continue;

        let availableBed: Bed | undefined;
        for (let bIdx = 0; bIdx < bedIds.length; bIdx++) {
          const bId = bedIds[bIdx]!;
          if (options?.occupiedBedIds ? options.occupiedBedIds.has(bId) : false) continue;
          const b = snap.beds.get(bId);
          if (b && b.status === "available" && !b.occupiedByUnitId) {
            availableBed = b;
            break;
          }
        }
        if (!availableBed) continue;

        // Room-level checks
        if (!hc4GenderPolicy(unit, room, snap).ok) continue;
        if (!hc5QuotaBucket(unit, room, snap).ok) continue;
        if (!hc7ProgrammeFilter(unit, room).ok) continue;
        if (!hc8FeeCategory(unit, room).ok) continue;
        if (!hc10GroupIntegrity(unit, room, snap).ok) continue;

        // Bed-level checks
        if (!hc3BedAvailable(availableBed, room, snap).ok) continue;
        if (!hc6Accessibility(unit, availableBed, snap).ok) continue;

        candidates.push(room);
      }

      // Sort: preferred hostels first (by index in preferenceHostelIds),
      // then alphabetically by hostelId for determinism.
      const prefOrder = new Map(unit.preferenceHostelIds.map((id, i) => [id, i]));

      candidates.sort((a, b) => {
        const ai = prefOrder.get(a.hostelId) ?? Infinity;
        const bi = prefOrder.get(b.hostelId) ?? Infinity;
        if (ai !== bi) return ai - bi;
        if (a.hostelId !== b.hostelId) return a.hostelId < b.hostelId ? -1 : 1;
        return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
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

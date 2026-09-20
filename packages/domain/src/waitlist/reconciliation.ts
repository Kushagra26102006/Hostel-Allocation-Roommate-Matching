/**
 * @hostelhub/domain — waitlist/reconciliation.ts
 *
 * Occupancy reconciliation logic.
 * Validates that cached room and hostel occupancy counters match exactly (0 drift)
 * against an independent recount from raw student assignments.
 */

import type { Bed, Room } from "../allocation/types.js";
import type { ReconciliationReport, OccupancyRecord } from "./types.js";

export interface RoomOccupancyCounter {
  roomId: string;
  cachedOccupancy: number;
}

export interface AssignmentRecord {
  id: string;
  studentId: string;
  bedId: string;
  roomId: string;
  hostelId: string;
  active: boolean;
}

/**
 * Reconciles room and hostel occupancy by comparing cached counters
 * against an independent recount of active assignments.
 */
export function reconcileOccupancy(
  rooms: Room[],
  beds: Bed[],
  assignments: AssignmentRecord[],
  cachedCounters: RoomOccupancyCounter[],
): ReconciliationReport {
  const cachedMap = new Map<string, number>();
  for (const c of cachedCounters) {
    cachedMap.set(c.roomId, c.cachedOccupancy);
  }

  // Independent recount from active assignments
  const liveCountByRoom = new Map<string, number>();
  for (const a of assignments) {
    if (!a.active) continue;
    const current = liveCountByRoom.get(a.roomId) ?? 0;
    liveCountByRoom.set(a.roomId, current + 1);
  }

  let totalHostelCapacity = 0;
  let totalAllocated = 0;
  const roomReports: OccupancyRecord[] = [];
  const discrepancies: Array<{ roomId: string; expected: number; actual: number }> = [];

  for (const room of rooms) {
    totalHostelCapacity += room.capacity;
    const actualAssigned = liveCountByRoom.get(room.id) ?? 0;
    const reportedCached = cachedMap.get(room.id) ?? 0;

    totalAllocated += actualAssigned;

    roomReports.push({
      roomId: room.id,
      roomNumber: room.roomNumber,
      capacity: room.capacity,
      allocatedCount: actualAssigned,
      isFull: actualAssigned >= room.capacity,
    });

    if (actualAssigned !== reportedCached) {
      discrepancies.push({
        roomId: room.id,
        expected: actualAssigned,
        actual: reportedCached,
      });
    }
  }

  const totalAvailable = Math.max(0, totalHostelCapacity - totalAllocated);

  return {
    totalHostelCapacity,
    totalAllocated,
    totalAvailable,
    roomReports,
    isExactMatch: discrepancies.length === 0,
    discrepancies,
  };
}

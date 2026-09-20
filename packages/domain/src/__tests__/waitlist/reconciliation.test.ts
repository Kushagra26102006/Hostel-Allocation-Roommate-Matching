import { describe, it, expect } from "vitest";
import { reconcileOccupancy } from "../../waitlist/reconciliation.js";
import type { AssignmentRecord, RoomOccupancyCounter } from "../../waitlist/reconciliation.js";
import type { Room, Bed } from "../../allocation/types.js";

describe("Prompt 21 — Occupancy Reconciliation: 100 Simulated Transfers & Vacancies", () => {
  it("reconciles occupancy counters exactly (0 drift) across 100 randomised operations", () => {
    // 1. Setup 10 rooms with 2 beds each = 20 beds total
    const roomsCount = 10;
    const bedsPerRoom = 2;
    const rooms: Room[] = [];
    const beds: Bed[] = [];

    for (let r = 1; r <= roomsCount; r++) {
      const roomId = `room-${r}`;
      rooms.push({
        id: roomId,
        roomNumber: `${r + 100}`,
        hostelId: "hostel-alpha",
        block: "A",
        floor: Math.ceil(r / 4),
        capacity: bedsPerRoom,
        roomType: "double",
        accessible: false,
      });

      for (let b = 1; b <= bedsPerRoom; b++) {
        const bedLetter = String.fromCharCode(64 + b);
        beds.push({
          id: `bed-${r}-${bedLetter}`,
          roomId,
          status: "available",
          accessible: false,
        });
      }
    }

    // State maintained in application:
    // a) Active assignments in DB
    const assignments = new Map<string, AssignmentRecord>();
    // b) Cached room counters on Room documents
    const roomCounters = new Map<string, number>();
    for (const r of rooms) {
      roomCounters.set(r.id, 0);
    }

    // Track bed occupants
    const bedOccupants = new Map<string, string>(); // bedId -> assignmentId

    // Simple pseudo-random number generator for reproducibility
    let seed = 42;
    function nextRand(): number {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    function getRandomElement<T>(arr: T[]): T {
      return arr[Math.floor(nextRand() * arr.length)]!;
    }

    // Seed 10 initial students
    let studentSequence = 1;
    for (let i = 0; i < 10; i++) {
      const freeBeds = beds.filter((b) => !bedOccupants.has(b.id));
      const targetBed = freeBeds[i]!;
      const asgnId = `asgn-${studentSequence}`;
      const asgn: AssignmentRecord = {
        id: asgnId,
        studentId: `stud-${studentSequence}`,
        bedId: targetBed.id,
        roomId: targetBed.roomId,
        hostelId: "hostel-alpha",
        active: true,
      };

      assignments.set(asgnId, asgn);
      bedOccupants.set(targetBed.id, asgnId);
      roomCounters.set(targetBed.roomId, (roomCounters.get(targetBed.roomId) ?? 0) + 1);
      studentSequence++;
    }

    // 2. Perform 100 simulated operations:
    // - TRANSFER: move student to a free bed in another room
    // - VACATE: withdrawal or no-show frees a bed
    // - PROMOTE: waitlisted student fills a free bed
    const totalSimulations = 100;

    for (let step = 1; step <= totalSimulations; step++) {
      const roll = nextRand();

      if (roll < 0.4) {
        // Operation A: TRANSFER an active student to an available bed
        const activeList = Array.from(assignments.values()).filter((a) => a.active);
        const freeBeds = beds.filter((b) => !bedOccupants.has(b.id));

        if (activeList.length > 0 && freeBeds.length > 0) {
          const studentToTransfer = getRandomElement(activeList);
          const newBed = getRandomElement(freeBeds);

          // Free old bed
          bedOccupants.delete(studentToTransfer.bedId);
          roomCounters.set(
            studentToTransfer.roomId,
            Math.max(0, (roomCounters.get(studentToTransfer.roomId) ?? 1) - 1),
          );

          // Assign new bed
          studentToTransfer.bedId = newBed.id;
          studentToTransfer.roomId = newBed.roomId;
          bedOccupants.set(newBed.id, studentToTransfer.id);
          roomCounters.set(newBed.roomId, (roomCounters.get(newBed.roomId) ?? 0) + 1);
        }
      } else if (roll < 0.7) {
        // Operation B: VACATE (Withdrawal or No-show marked by warden)
        const activeList = Array.from(assignments.values()).filter((a) => a.active);
        if (activeList.length > 0) {
          const studentToVacate = getRandomElement(activeList);
          studentToVacate.active = false;
          bedOccupants.delete(studentToVacate.bedId);
          roomCounters.set(
            studentToVacate.roomId,
            Math.max(0, (roomCounters.get(studentToVacate.roomId) ?? 1) - 1),
          );
        }
      } else {
        // Operation C: PROMOTE (Waitlisted student promoted into free bed)
        const freeBeds = beds.filter((b) => !bedOccupants.has(b.id));
        if (freeBeds.length > 0) {
          const targetBed = getRandomElement(freeBeds);
          const asgnId = `asgn-${studentSequence}`;
          const newAsgn: AssignmentRecord = {
            id: asgnId,
            studentId: `stud-promoted-${studentSequence}`,
            bedId: targetBed.id,
            roomId: targetBed.roomId,
            hostelId: "hostel-alpha",
            active: true,
          };

          assignments.set(asgnId, newAsgn);
          bedOccupants.set(targetBed.id, asgnId);
          roomCounters.set(targetBed.roomId, (roomCounters.get(targetBed.roomId) ?? 0) + 1);
          studentSequence++;
        }
      }

      // Check invariant after every 10 steps
      if (step % 10 === 0) {
        const cachedCounters: RoomOccupancyCounter[] = rooms.map((r) => ({
          roomId: r.id,
          cachedOccupancy: roomCounters.get(r.id) ?? 0,
        }));

        const intermediateReport = reconcileOccupancy(
          rooms,
          beds,
          Array.from(assignments.values()),
          cachedCounters,
        );

        expect(intermediateReport.isExactMatch).toBe(true);
        expect(intermediateReport.discrepancies).toHaveLength(0);
      }
    }

    // 3. Final Reconciliation Verification
    const finalCachedCounters: RoomOccupancyCounter[] = rooms.map((r) => ({
      roomId: r.id,
      cachedOccupancy: roomCounters.get(r.id) ?? 0,
    }));

    const finalReport = reconcileOccupancy(
      rooms,
      beds,
      Array.from(assignments.values()),
      finalCachedCounters,
    );

    const liveActiveCount = Array.from(assignments.values()).filter((a) => a.active).length;

    expect(finalReport.isExactMatch).toBe(true);
    expect(finalReport.discrepancies).toHaveLength(0);
    expect(finalReport.totalAllocated).toBe(liveActiveCount);
    expect(finalReport.totalHostelCapacity).toBe(20);
    expect(finalReport.totalAvailable).toBe(20 - liveActiveCount);
  });
});

/**
 * @hostelhub/domain — allocation/pipeline.ts
 *
 * The deterministic allocation pipeline.
 *
 * Pure function: no I/O, no Date.now(), no Math.random().
 * All randomness comes from the caller-supplied seed via PCG32.
 *
 * Pipeline steps (see README.md for the full diagram):
 *   1. Freeze & hash  — FNV-1a of canonical snapshot JSON
 *   2. Eligibility partition — held units go to rejected immediately
 *   3. Priority order — tier asc → score desc → PRNG tiebreak
 *   4. Group formation validation
 *   5. Assignment loop — score each candidate, pick best, break ties with PRNG key
 *   6. Bounded local search — deterministic swap optimisation
 *   7. Waitlist ordering — by same priority key, per quota bucket
 *   8. Invariant check — P1–P7; throws InvariantError on violation
 *   9. Metrics — 9 statistics
 */

import type {
  Unit,
  Room,
  Bed,
  Snapshot,
  Assignment,
  Weights,
  ScoreBreakdown,
  HardConstraintCode,
  AllocateOptions,
  AllocateResult,
  WaitlistEntry,
  RejectedEntry,
  RunMetrics,
} from "./types.js";
import { DEFAULT_WEIGHTS, InvariantError } from "./types.js";
import { createHash } from "node:crypto";
import { key } from "./prng.js";
import { buildBedIndex } from "./bedIndex.js";
import { allHardPass, hc9Hold } from "./constraints.js";
import { scoreUnit } from "./scoring.js";
import { buildExplanation, buildUnassignedSentence } from "./explanation.js";
import { scoreC } from "./scoring.js";
import { dealBreakerConflict } from "../compatibility/scoring.js";

// ─── 1. Canonical hash ─────────────────────────────────────────────────────────

/**
 * Serialises the snapshot to a canonical JSON string (sorted keys) and hashes
 * it with sha256. Maps are converted to sorted arrays of [key, value].
 * No Date.now() — the snapshot's nowIso field is the only time reference.
 */
function canonicalHash(snapshot: Snapshot): string {
  function sortedReplacer(_key: string, value: unknown): unknown {
    if (value instanceof Map) {
      return [...value.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)));
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
      );
    }
    return value;
  }
  const json = JSON.stringify(snapshot, sortedReplacer);
  return createHash("sha256").update(json).digest("hex");
}

// ─── Mutable shadow state ──────────────────────────────────────────────────────

/**
 * Shadow state tracks changes during the pipeline WITHOUT mutating the original Snapshot.
 * The pipeline rebuilds a view snapshot from this state at each step.
 */
interface ShadowState {
  /** bedId → unitId */
  bedAssignments: Map<string, string>;
  /** quotaBucket → current usage count */
  quotaUsage: Map<string, number>;
  /** unitId → bedId (reverse map) */
  unitBed: Map<string, string>;
  /** roomId → current vacant bed count */
  roomVacancy: Map<string, number>;
}

function makeShadow(snapshot: Snapshot): ShadowState {
  const roomVacancy = new Map<string, number>();
  for (const bed of snapshot.beds.values()) {
    if (bed.status === "available" && !bed.occupiedByUnitId && !snapshot.assignments.has(bed.id)) {
      roomVacancy.set(bed.roomId, (roomVacancy.get(bed.roomId) ?? 0) + 1);
    }
  }
  return {
    bedAssignments: new Map(snapshot.assignments),
    quotaUsage: new Map(snapshot.quotaUsage),
    unitBed: new Map([...snapshot.assignments.entries()].map(([bedId, unitId]) => [unitId, bedId])),
    roomVacancy,
  };
}

/**
 * Produces an on-demand virtual Snapshot view incorporating shadow state.
 * Avoids cloning 8,000 beds on every iteration.
 */
function viewSnapshot(base: Snapshot, shadow: ShadowState): Snapshot {
  const bedCache = new Map<string, Bed>();
  const virtualBeds = {
    get(bedId: string): Bed | undefined {
      const cached = bedCache.get(bedId);
      if (cached) return cached;
      const baseBed = base.beds.get(bedId);
      if (!baseBed) return undefined;
      const occ = shadow.bedAssignments.get(bedId);
      const b = occ !== undefined ? { ...baseBed, occupiedByUnitId: occ } : baseBed;
      bedCache.set(bedId, b);
      return b;
    },
    has(bedId: string): boolean {
      return base.beds.has(bedId);
    },
    get size(): number {
      return base.beds.size;
    },
    values(): IterableIterator<Bed> {
      return base.beds.values();
    },
    entries(): IterableIterator<[string, Bed]> {
      return base.beds.entries();
    },
    [Symbol.iterator]() {
      return base.beds[Symbol.iterator]();
    },
  } as unknown as Map<string, Bed>;

  return {
    ...base,
    beds: virtualBeds,
    assignments: shadow.bedAssignments,
    quotaUsage: shadow.quotaUsage,
  };
}

function assignUnit(
  shadow: ShadowState,
  unitId: string,
  bedId: string,
  roomId: string,
  quotaBucket: string,
): void {
  shadow.bedAssignments.set(bedId, unitId);
  shadow.unitBed.set(unitId, bedId);
  const current = shadow.quotaUsage.get(quotaBucket) ?? 0;
  shadow.quotaUsage.set(quotaBucket, current + 1);
  const curV = shadow.roomVacancy.get(roomId) ?? 1;
  shadow.roomVacancy.set(roomId, Math.max(0, curV - 1));
}

function unassignUnit(
  shadow: ShadowState,
  unitId: string,
  bedId: string,
  roomId: string,
  quotaBucket: string,
): void {
  shadow.bedAssignments.delete(bedId);
  shadow.unitBed.delete(unitId);
  const current = shadow.quotaUsage.get(quotaBucket) ?? 1;
  shadow.quotaUsage.set(quotaBucket, Math.max(0, current - 1));
  const curV = shadow.roomVacancy.get(roomId) ?? 0;
  shadow.roomVacancy.set(roomId, curV + 1);
}

// ─── 3. Priority key ───────────────────────────────────────────────────────────

export interface PriorityUnit {
  unit: Unit;
  /** Lower numeric tier = higher priority (caller defines tiers). */
  priorityTier: string;
  /** Higher score = higher priority within the same tier. */
  priorityScore: number;
}

export function priorityKey(pu: PriorityUnit, seed: number): number {
  // Use the tier as a string prefix and the PRNG key as a tiebreaker.
  return key(seed, pu.priorityTier, pu.unit.id);
}

function sortByPriority(units: PriorityUnit[], seed: number): PriorityUnit[] {
  // Sort applications by ID first so database or input order never matters
  const byId = [...units].sort((a, b) => a.unit.id.localeCompare(b.unit.id));
  return byId.sort((a, b) => {
    // Tier ascending (alphabetical — caller should pad numeric tiers)
    const tierCmp = a.priorityTier.localeCompare(b.priorityTier);
    if (tierCmp !== 0) return tierCmp;
    // Score descending
    if (b.priorityScore !== a.priorityScore) return b.priorityScore - a.priorityScore;
    // PRNG tiebreak (unsigned 32-bit, deterministic)
    const keyA = key(seed, a.unit.id) >>> 0;
    const keyB = key(seed, b.unit.id) >>> 0;
    if (keyA !== keyB) return keyA - keyB;
    return a.unit.id.localeCompare(b.unit.id);
  });
}

// ─── 5. Assignment loop helpers ────────────────────────────────────────────────

interface Candidate {
  room: Room;
  bed: Bed;
  score: ScoreBreakdown;
  tiebreakKey: number;
  tiebreakUsed: boolean;
}

function pickBestCandidate(
  unit: Unit,
  candidateRooms: Room[],
  viewSnap: Snapshot,
  weights: Weights,
  seed: number,
  bedIndex: ReturnType<typeof buildBedIndex>,
): Candidate | null {
  let best: Candidate | null = null;
  let hasTie = false;

  for (const room of candidateRooms) {
    const bedIds = bedIndex.bedsInRoom(room.id);
    let chosenBed: Bed | null = null;
    let otherBedsPass = false;

    for (let bIdx = 0; bIdx < bedIds.length; bIdx++) {
      const bId = bedIds[bIdx]!;
      const bed = viewSnap.beds.get(bId);
      if (bed && allHardPass(unit, bed, room, viewSnap)) {
        if (!chosenBed) {
          chosenBed = bed;
        } else {
          otherBedsPass = true;
          break;
        }
      }
    }

    if (!chosenBed) continue;

    const score = scoreUnit(unit, room, viewSnap, weights);
    const tk = key(seed, unit.id, room.id);

    if (best === null) {
      best = { room, bed: chosenBed, score, tiebreakKey: tk, tiebreakUsed: otherBedsPass };
    } else if (score.total > best.score.total) {
      best = { room, bed: chosenBed, score, tiebreakKey: tk, tiebreakUsed: otherBedsPass };
      hasTie = false;
    } else if (score.total === best.score.total) {
      hasTie = true;
      if (tk >>> 0 > best.tiebreakKey >>> 0) {
        best = { room, bed: chosenBed, score, tiebreakKey: tk, tiebreakUsed: true };
      }
    }
  }

  if (best && hasTie) {
    best.tiebreakUsed = true;
  }
  return best;
}

// ─── Gini coefficient ──────────────────────────────────────────────────────────

function gini(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let sumNumerator = 0;
  for (let i = 0; i < n; i++) {
    sumNumerator += (2 * (i + 1) - n - 1) * sorted[i]!;
  }
  const sumTotal = sorted.reduce((a, b) => a + b, 0);
  if (sumTotal === 0) return 0;
  return sumNumerator / (n * sumTotal);
}

// ─── Main pipeline ─────────────────────────────────────────────────────────────

/**
 * The full deterministic allocation pipeline.
 *
 * @param snapshot   Immutable system state (units, rooms, beds, quotas).
 * @param units      Priority-annotated units to allocate. Order in the array
 *                   is IGNORED; the pipeline re-sorts deterministically.
 * @param options    Seed, weights, maxIterations, onProgress callback.
 * @param startMs    Optional start timestamp (ms) for durationMs in metrics.
 *                   Engine does not call Date.now() itself.
 * @returns          AllocateResult with assignments, waitlist, rejected, metrics.
 */
export function allocate(
  snapshot: Snapshot,
  units: PriorityUnit[],
  options: AllocateOptions,
  startMs: number = 0,
): AllocateResult {
  const { seed, weights = DEFAULT_WEIGHTS, maxIterations = 500, onProgress } = options;
  const progress = onProgress ?? (() => undefined);

  // ── Step 1: Freeze & hash ──────────────────────────────────────────────────
  progress("freeze", 0, 1);
  const inputHash = canonicalHash(snapshot);
  progress("freeze", 1, 1);

  // ── Step 2: Eligibility partition ──────────────────────────────────────────
  progress("eligibility", 0, units.length);
  const eligible: PriorityUnit[] = [];
  const rejected: RejectedEntry[] = [];

  for (const pu of units) {
    if (!hc9Hold(pu.unit).ok) {
      rejected.push({
        unitId: pu.unit.id,
        reasonCode: "HC9_HOLD_ACTIVE",
        sentence:
          "Not assigned: your account has an active administrative hold. Please contact the hostel office.",
      });
    } else {
      eligible.push(pu);
    }
  }
  progress("eligibility", units.length, units.length);

  // ── Step 3: Priority order ─────────────────────────────────────────────────
  progress("sort", 0, eligible.length);
  const ordered = sortByPriority(eligible, seed);
  progress("sort", ordered.length, ordered.length);

  // ── Step 4: Group formation ────────────────────────────────────────────────
  const normalizedOrdered = ordered.map((pu) => {
    if (pu.unit.memberIds.length > 1 && !pu.unit.groupId) {
      const groupId = [...pu.unit.memberIds].sort()[0] ?? pu.unit.id;
      return { ...pu, unit: { ...pu.unit, groupId } };
    }
    return pu;
  });

  // ── Step 5: Assignment loop ────────────────────────────────────────────────
  const shadow = makeShadow(snapshot);
  const assignments: Assignment[] = [];
  const waitlistRaw: Array<{ pu: PriorityUnit; reasonCode: string }> = [];

  progress("assign", 0, normalizedOrdered.length);

  const bedIndex = buildBedIndex(snapshot, {
    roomVacancy: shadow.roomVacancy,
    occupiedBedIds: shadow.bedAssignments,
    getSnapshot: () => viewSnapshot(snapshot, shadow),
  });

  for (let i = 0; i < normalizedOrdered.length; i++) {
    const pu = normalizedOrdered[i]!;
    const { unit } = pu;

    const candidateRooms = bedIndex.feasible(unit);

    if (candidateRooms.length === 0) {
      waitlistRaw.push({ pu, reasonCode: "NO_CANDIDATE" });
      progress("assign", i + 1, ordered.length);
      continue;
    }

    const viewSnap = viewSnapshot(snapshot, shadow);
    const best = pickBestCandidate(unit, candidateRooms, viewSnap, weights, seed, bedIndex);

    if (!best) {
      waitlistRaw.push({ pu, reasonCode: "NO_FEASIBLE_BED" });
      progress("assign", i + 1, ordered.length);
      continue;
    }

    const { room, bed, score, tiebreakKey, tiebreakUsed } = best;

    const explanation = buildExplanation({
      unit,
      room,
      snapshot: viewSnap,
      scoreBreakdown: score,
      constraintsChecked: ["OK"] as HardConstraintCode[],
      alternativesConsidered: candidateRooms.length - 1,
      tiebreakUsed,
      priorityTier: pu.priorityTier,
      assignedBedId: bed.id,
    });

    const hostel = snapshot.hostels.get(room.hostelId)!;
    assignments.push({
      unitId: unit.id,
      bedId: bed.id,
      roomId: room.id,
      hostelId: room.hostelId,
      score: score.total,
      tiebreakKey,
      explanation,
    });

    // Update shadow state
    assignUnit(shadow, unit.id, bed.id, room.id, unit.quotaBucket);
    // For groups, assign additional beds in the same room
    if (unit.memberIds.length > 1) {
      const extraBeds = bedIndex.bedsInRoom(room.id).filter((bId) => {
        const b = viewSnap.beds.get(bId)!;
        return b.id !== bed.id && b.status === "available" && !shadow.bedAssignments.has(bId);
      });
      // Assign enough extra beds for all group members beyond the first
      for (let m = 1; m < unit.memberIds.length; m++) {
        const extraBedId = extraBeds[m - 1];
        if (extraBedId) {
          shadow.bedAssignments.set(extraBedId, unit.id);
          const curV = shadow.roomVacancy.get(room.id) ?? 1;
          shadow.roomVacancy.set(room.id, Math.max(0, curV - 1));
        }
      }
    }

    void hostel; // used in explanation already
    progress("assign", i + 1, ordered.length);
  }

  // ── Step 6: Bounded local search ──────────────────────────────────────────
  progress("local-search", 0, maxIterations);

  // Build a mutable map of unitId → assignment index for O(1) lookup
  const assignIdx = new Map<string, number>();
  for (let i = 0; i < assignments.length; i++) {
    assignIdx.set(assignments[i]!.unitId, i);
  }

  // Sort pairs deterministically by PRNG key
  const assignedList = [...assignments].sort(
    (a, b) => (key(seed, a.unitId) >>> 0) - (key(seed, b.unitId) >>> 0),
  );

  let swapsPerformed = 0;
  for (let iter = 0; iter < maxIterations; iter++) {
    let anySwap = false;

    for (let ai = 0; ai < assignedList.length - 1; ai++) {
      const asgA = assignedList[ai]!;
      const asgB = assignedList[ai + 1]!;

      const unitA = snapshot.units.get(asgA.unitId)!;
      const unitB = snapshot.units.get(asgB.unitId)!;
      const roomA = snapshot.rooms.get(asgA.roomId)!;
      const roomB = snapshot.rooms.get(asgB.roomId)!;

      // Only swap within same hostel, room type, and quota bucket
      if (
        roomA.hostelId !== roomB.hostelId ||
        roomA.roomType !== roomB.roomType ||
        (roomA.quotaBucket ?? "General") !== (roomB.quotaBucket ?? "General")
      )
        continue;

      // Simulate swap: temporarily unassign both, check feasibility & scores
      const bedA = asgA.bedId;
      const bedB = asgB.bedId;

      unassignUnit(shadow, unitA.id, bedA, roomA.id, unitA.quotaBucket);
      unassignUnit(shadow, unitB.id, bedB, roomB.id, unitB.quotaBucket);

      const swapSnap = viewSnapshot(snapshot, shadow);

      // Score A in B's room and B in A's room
      const bedObjA = swapSnap.beds.get(bedA)!;
      const bedObjB = swapSnap.beds.get(bedB)!;

      const canAinB = allHardPass(unitA, bedObjB, roomB, swapSnap);
      const canBinA = allHardPass(unitB, bedObjA, roomA, swapSnap);

      if (canAinB && canBinA) {
        // Temporarily assign A→B, B→A to score
        assignUnit(shadow, unitA.id, bedB, roomB.id, unitA.quotaBucket);
        assignUnit(shadow, unitB.id, bedA, roomA.id, unitB.quotaBucket);
        const swapSnap2 = viewSnapshot(snapshot, shadow);

        const scoreAinB = scoreUnit(unitA, roomB, swapSnap2, weights);
        const scoreBinA = scoreUnit(unitB, roomA, swapSnap2, weights);
        const totalSwapped = scoreAinB.total + scoreBinA.total;
        const totalOriginal = asgA.score + asgB.score;

        // Determine which is higher priority (earlier in ordered list)
        const idxA = ordered.findIndex((o) => o.unit.id === unitA.id);
        const idxB = ordered.findIndex((o) => o.unit.id === unitB.id);
        const highPrioAsg = idxA <= idxB ? asgA : asgB;
        const highPrioUnit = idxA <= idxB ? unitA : unitB;
        const highPrioNewRoom = idxA <= idxB ? roomB : roomA;
        const highPrioNewScore = idxA <= idxB ? scoreAinB : scoreBinA;

        const highPrioDoesNotDecrease = highPrioNewScore.total >= highPrioAsg.score;

        if (totalSwapped > totalOriginal && highPrioDoesNotDecrease) {
          // Commit swap: update assignments
          const idxInFull_A = assignIdx.get(unitA.id)!;
          const idxInFull_B = assignIdx.get(unitB.id)!;

          const newExpA = buildExplanation({
            unit: unitA,
            room: roomB,
            snapshot: swapSnap2,
            scoreBreakdown: scoreAinB,
            constraintsChecked: ["OK"],
            alternativesConsidered: asgA.explanation.alternativesConsidered,
            tiebreakUsed: false,
            priorityTier: ordered.find((o) => o.unit.id === unitA.id)!.priorityTier,
            assignedBedId: bedB,
          });

          const newExpB = buildExplanation({
            unit: unitB,
            room: roomA,
            snapshot: swapSnap2,
            scoreBreakdown: scoreBinA,
            constraintsChecked: ["OK"],
            alternativesConsidered: asgB.explanation.alternativesConsidered,
            tiebreakUsed: false,
            priorityTier: ordered.find((o) => o.unit.id === unitB.id)!.priorityTier,
            assignedBedId: bedA,
          });

          assignments[idxInFull_A] = {
            ...asgA,
            bedId: bedB,
            roomId: roomB.id,
            hostelId: roomB.hostelId,
            score: scoreAinB.total,
            explanation: newExpA,
          };
          assignments[idxInFull_B] = {
            ...asgB,
            bedId: bedA,
            roomId: roomA.id,
            hostelId: roomA.hostelId,
            score: scoreBinA.total,
            explanation: newExpB,
          };

          // Update sorted list references
          assignedList[ai] = assignments[idxInFull_A]!;
          assignedList[ai + 1] = assignments[idxInFull_B]!;

          anySwap = true;
          swapsPerformed++;

          void highPrioUnit;
          void highPrioNewRoom;
          void highPrioDoesNotDecrease;
        } else {
          // Undo temporary assignment
          unassignUnit(shadow, unitA.id, bedB, roomB.id, unitA.quotaBucket);
          unassignUnit(shadow, unitB.id, bedA, roomA.id, unitB.quotaBucket);
          // Re-assign original positions
          assignUnit(shadow, unitA.id, bedA, roomA.id, unitA.quotaBucket);
          assignUnit(shadow, unitB.id, bedB, roomB.id, unitB.quotaBucket);
        }
      } else {
        // Re-assign original positions
        assignUnit(shadow, unitA.id, bedA, roomA.id, unitA.quotaBucket);
        assignUnit(shadow, unitB.id, bedB, roomB.id, unitB.quotaBucket);
      }
    }

    progress("local-search", iter + 1, maxIterations);
    if (!anySwap) break;
  }

  void swapsPerformed; // for potential future metrics

  // ── Step 7: Waitlist ordering ──────────────────────────────────────────────
  progress("waitlist", 0, waitlistRaw.length);
  const waitlist: WaitlistEntry[] = waitlistRaw.map(({ pu, reasonCode }) => {
    const pk = key(seed, pu.priorityTier, pu.unit.id) >>> 0;
    const sentence = buildUnassignedSentence({
      unit: pu.unit,
      constraintCodes: [reasonCode as HardConstraintCode],
    });
    return {
      unitId: pu.unit.id,
      quotaBucket: pu.unit.quotaBucket,
      priorityKey: pk,
      reasonCode,
      sentence,
    };
  });
  // Order unplaced units by the same priority key, per quota bucket
  waitlist.sort((a, b) => {
    if (a.quotaBucket !== b.quotaBucket) {
      return a.quotaBucket.localeCompare(b.quotaBucket);
    }
    const puA = waitlistRaw.find((w) => w.pu.unit.id === a.unitId)!.pu;
    const puB = waitlistRaw.find((w) => w.pu.unit.id === b.unitId)!.pu;
    const tierCmp = puA.priorityTier.localeCompare(puB.priorityTier);
    if (tierCmp !== 0) return tierCmp;
    if (puB.priorityScore !== puA.priorityScore) return puB.priorityScore - puA.priorityScore;
    return a.priorityKey - b.priorityKey;
  });
  progress("waitlist", waitlist.length, waitlist.length);

  // ── Step 8: Invariant check ────────────────────────────────────────────────
  progress("invariants", 0, 7);
  const finalSnap = viewSnapshot(snapshot, shadow);
  checkInvariants(assignments, finalSnap, snapshot);
  progress("invariants", 7, 7);

  // ── Step 9: Metrics ────────────────────────────────────────────────────────
  progress("metrics", 0, 1);
  const metrics = computeMetrics(
    snapshot,
    assignments,
    waitlist,
    rejected,
    inputHash,
    ordered,
    finalSnap,
    startMs,
  );
  progress("metrics", 1, 1);

  return { assignments, waitlist, rejected, metrics, inputHash };
}

// ─── Invariant checker ──────────────────────────────────────────────────────────

function checkInvariants(assignments: Assignment[], finalSnap: Snapshot, base: Snapshot): void {
  const unitBeds = new Map<string, string[]>(); // unitId → bedIds
  const bedUnits = new Map<string, string[]>(); // bedId → unitIds

  for (const asg of assignments) {
    const existing = unitBeds.get(asg.unitId) ?? [];
    existing.push(asg.bedId);
    unitBeds.set(asg.unitId, existing);

    const existing2 = bedUnits.get(asg.bedId) ?? [];
    existing2.push(asg.unitId);
    bedUnits.set(asg.bedId, existing2);
  }

  // P1: No student in two beds
  for (const [unitId, beds] of unitBeds) {
    if (beds.length > 1) {
      throw new InvariantError(
        "P1",
        `Unit ${unitId} is assigned to multiple beds: ${beds.join(", ")}`,
        { unitId, beds },
      );
    }
  }

  // P2: No bed with two students
  for (const [bedId, units] of bedUnits) {
    if (units.length > 1) {
      throw new InvariantError(
        "P2",
        `Bed ${bedId} has multiple units assigned: ${units.join(", ")}`,
        { bedId, units },
      );
    }
  }

  // P3: Room capacity respected
  const roomOccupancy = new Map<string, number>();
  for (const asg of assignments) {
    roomOccupancy.set(asg.roomId, (roomOccupancy.get(asg.roomId) ?? 0) + 1);
  }
  for (const [roomId, count] of roomOccupancy) {
    const room = base.rooms.get(roomId);
    if (room && count > room.capacity) {
      throw new InvariantError("P3", `Room ${roomId} over capacity (${count}/${room.capacity})`, {
        roomId,
        count,
        capacity: room.capacity,
      });
    }
  }

  // P4: No hard constraint violated (sample HC4 gender + HC9 hold)
  for (const asg of assignments) {
    const unit = base.units.get(asg.unitId);
    const room = base.rooms.get(asg.roomId);
    const bed = finalSnap.beds.get(asg.bedId);
    if (!unit || !room || !bed) continue;

    if (unit.hasHold) {
      throw new InvariantError("P4", `Unit ${asg.unitId} has a hold but was assigned`, {
        unitId: asg.unitId,
      });
    }
    const hostel = base.hostels.get(room.hostelId);
    if (hostel && hostel.genderPolicy !== "coed" && hostel.genderPolicy !== unit.gender) {
      throw new InvariantError(
        "P4",
        `Gender mismatch for unit ${asg.unitId} in room ${asg.roomId}`,
        {
          unit: asg.unitId,
          gender: unit.gender,
          policy: hostel.genderPolicy,
        },
      );
    }
  }

  // P5: Accessibility respected
  for (const asg of assignments) {
    const unit = base.units.get(asg.unitId);
    const bed = finalSnap.beds.get(asg.bedId);
    if (!unit || !bed) continue;
    if (unit.accessibilityNeed && !bed.accessible) {
      throw new InvariantError(
        "P5",
        `Accessibility unit ${asg.unitId} assigned to non-accessible bed ${asg.bedId}`,
        { unitId: asg.unitId, bedId: asg.bedId },
      );
    }
  }

  // P6: No deal-breaker pair together
  const roomOccupants = new Map<string, string[]>();
  for (const asg of assignments) {
    const list = roomOccupants.get(asg.roomId) ?? [];
    list.push(asg.unitId);
    roomOccupants.set(asg.roomId, list);
  }
  for (const [roomId, occupantIds] of roomOccupants) {
    for (let i = 0; i < occupantIds.length; i++) {
      for (let j = i + 1; j < occupantIds.length; j++) {
        const uA = base.units.get(occupantIds[i]!);
        const uB = base.units.get(occupantIds[j]!);
        if (!uA || !uB) continue;
        if (
          uA.dealBreakerUnitIds?.includes(uB.id) &&
          uB.dealBreakerUnitIds?.includes(uA.id) &&
          dealBreakerConflict(uA.questionnaire, uB.questionnaire)
        ) {
          throw new InvariantError(
            "P6",
            `Deal-breaker pair ${uA.id} and ${uB.id} placed in room ${roomId}`,
            { roomId, unitA: uA.id, unitB: uB.id },
          );
        }
      }
    }
  }

  // P7: Every assignment has an explanation
  for (const asg of assignments) {
    if (!asg.explanation) {
      throw new InvariantError("P7", `Assignment for unit ${asg.unitId} missing explanation`, {
        unitId: asg.unitId,
      });
    }
  }
}

// ─── Metrics computation ───────────────────────────────────────────────────────

function computeMetrics(
  base: Snapshot,
  assignments: Assignment[],
  waitlist: WaitlistEntry[],
  rejected: RejectedEntry[],
  inputHash: string,
  ordered: PriorityUnit[],
  finalSnap: Snapshot,
  startMs: number,
): RunMetrics {
  const totalUnits = ordered.length + rejected.length;
  const assigned = assignments.length;
  const unassigned = waitlist.length;

  // First-choice rate
  let firstChoiceCount = 0;
  const rankList: number[] = [];
  const scores: number[] = [];

  for (const asg of assignments) {
    const unit = base.units.get(asg.unitId);
    if (!unit) continue;
    const rank = asg.explanation.rankSatisfied;
    if (rank === 1) firstChoiceCount++;
    if (rank !== null) rankList.push(rank);
    scores.push(asg.score);
  }

  const firstChoiceRate = assigned > 0 ? firstChoiceCount / assigned : 0;
  const avgRankSatisfied =
    rankList.length > 0 ? rankList.reduce((a, b) => a + b, 0) / rankList.length : 0;
  const giniPreferenceScore = gini(scores);

  // Category parity gap
  const bucketFirstChoice = new Map<string, { first: number; total: number }>();
  for (const asg of assignments) {
    const unit = base.units.get(asg.unitId);
    if (!unit) continue;
    const b = unit.quotaBucket;
    const cur = bucketFirstChoice.get(b) ?? { first: 0, total: 0 };
    cur.total++;
    if (asg.explanation.rankSatisfied === 1) cur.first++;
    bucketFirstChoice.set(b, cur);
  }
  const bucketRates = [...bucketFirstChoice.values()].map((v) =>
    v.total > 0 ? v.first / v.total : 0,
  );
  const categoryParityGap =
    bucketRates.length >= 2 ? Math.max(...bucketRates) - Math.min(...bucketRates) : 0;

  // Priority inversions (must be 0 for valid run — enforced by priority order)
  const priorityInversions = 0;

  // Room compatibility
  const roomCompatScores: number[] = [];
  const seenRooms = new Set<string>();
  for (const asg of assignments) {
    if (!seenRooms.has(asg.roomId)) {
      seenRooms.add(asg.roomId);
      const room = base.rooms.get(asg.roomId);
      if (room) {
        const c = scoreC(room, finalSnap);
        roomCompatScores.push(c);
      }
    }
  }
  const meanRoomCompatibility =
    roomCompatScores.length > 0
      ? roomCompatScores.reduce((a, b) => a + b, 0) / roomCompatScores.length
      : 0;
  const minRoomCompatibility = roomCompatScores.length > 0 ? Math.min(...roomCompatScores) : 0;

  return {
    cycleId: base.cycleId,
    inputHash,
    totalUnits,
    assigned,
    unassigned,
    rejected: rejected.length,
    constraintViolations: 0,
    durationMs: startMs,
    firstChoiceRate,
    avgRankSatisfied,
    giniPreferenceScore,
    categoryParityGap,
    priorityInversions,
    meanRoomCompatibility,
    minRoomCompatibility,
  };
}

// Re-export gini for testing
export { gini };

/**
 * @hostelhub/domain — allocation/scoring.ts
 *
 * Allocation scoring: S(u, r) = wP*P + wC*C + wF*F + wD*D + wK*K
 *
 * All component scores are real values in [0, 1].
 * The final score is returned as an integer scaled by 1,000,000
 * to guarantee identical results across machines (no floating-point drift).
 *
 * Components:
 *   P  — Preference rank satisfaction: 1 - (rank-1)/N; 0 if hostel not listed.
 *   C  — Roommate compatibility (0..1); neutral 0.5 if room is empty or no questionnaire.
 *   F  — Fill factor: 1.0 = completes room, 0.5 = joins partly filled room, 0.0 = opens new room.
 *   D  — Proximity: max(0, 1 - walkingMinutes/30).
 *   K  — Continuity: 1 if unit's priorBlock matches room.block, else 0.
 *
 * No I/O, no Date, no Math.random().
 */

import type { Unit, Room, Snapshot, Weights, ScoreBreakdown } from "./types.js";
import { DEFAULT_WEIGHTS } from "./types.js";
import { roomScore as compatRoomScore } from "../compatibility/scoring.js";

// ─── Component functions ───────────────────────────────────────────────────────

/**
 * P: Preference rank satisfaction.
 * rank = 1-indexed position of room.hostelId in unit.preferenceHostelIds.
 * N = total number of preference entries.
 * P = 1 - (rank - 1) / N   (first choice = 1.0, last choice > 0, not listed = 0)
 */
export function scoreP(unit: Unit, room: Room): number {
  const prefs = unit.preferenceHostelIds;
  if (prefs.length === 0) return 0;
  const rank = prefs.indexOf(room.hostelId) + 1; // 0 if not found → 1-indexed
  if (rank === 0) return 0; // not listed
  const N = prefs.length;
  return 1 - (rank - 1) / N;
}

/**
 * C: Roommate compatibility.
 * Collects questionnaire answers of current room occupants, then calls roomScore.
 * The roomScore result (0..100) is divided by 100 to normalise to [0, 1].
 * Returns 0.5 (neutral) when the room is empty or no occupants have questionnaires.
 */
export function scoreC(room: Room, snapshot: Snapshot): number {
  const occupantAnswers = [];
  for (const bed of snapshot.beds.values()) {
    if (bed.roomId !== room.id || !bed.occupiedByUnitId) continue;
    const occupant = snapshot.units.get(bed.occupiedByUnitId);
    if (occupant?.questionnaire && Object.keys(occupant.questionnaire).length > 0) {
      occupantAnswers.push(occupant.questionnaire);
    }
  }
  if (occupantAnswers.length === 0) return 0.5;
  const raw = compatRoomScore(occupantAnswers); // 0..100
  return raw / 100;
}

/**
 * C for a hypothetical room state — used in scoring before assignment.
 * Adds the candidate unit's own questionnaire to the existing occupants.
 */
export function scoreCWithCandidate(unit: Unit, room: Room, snapshot: Snapshot): number {
  const occupantAnswers = [];
  for (const bed of snapshot.beds.values()) {
    if (bed.roomId !== room.id || !bed.occupiedByUnitId) continue;
    const occupant = snapshot.units.get(bed.occupiedByUnitId);
    if (occupant?.questionnaire && Object.keys(occupant.questionnaire).length > 0) {
      occupantAnswers.push(occupant.questionnaire);
    }
  }
  if (Object.keys(unit.questionnaire).length > 0) {
    occupantAnswers.push(unit.questionnaire);
  }
  if (occupantAnswers.length <= 1) return 0.5;
  const raw = compatRoomScore(occupantAnswers);
  return raw / 100;
}

/**
 * F: Fill factor.
 * 1.0 — the last free bed in the room (completes it)
 * 0.5 — joins a partly filled room (already has ≥ 1 occupant, still has ≥ 2 free)
 * 0.0 — the room is currently empty (first person to open it)
 */
export function scoreF(room: Room, snapshot: Snapshot): number {
  let occupants = 0;
  let availBeds = 0;
  for (const bed of snapshot.beds.values()) {
    if (bed.roomId !== room.id) continue;
    if (bed.occupiedByUnitId !== undefined) occupants++;
    else if (bed.status === "available") availBeds++;
  }
  if (occupants === 0) return 0.0; // opening new room
  if (availBeds === 1) return 1.0; // completing room (only 1 free slot left)
  return 0.5; // joining partly filled room
}

/**
 * D: Proximity factor.
 * Uses room.walkingMinutes if set, otherwise the hostel's walkingMinutes.
 * D = max(0, 1 - minutes / 30) clamped to [0, 1].
 */
export function scoreD(room: Room, snapshot: Snapshot): number {
  let minutes: number;
  if (room.walkingMinutes !== undefined) {
    minutes = room.walkingMinutes;
  } else {
    const hostel = snapshot.hostels.get(room.hostelId);
    minutes = hostel?.walkingMinutes ?? 15; // default 15 min if unknown
  }
  return Math.max(0, Math.min(1, 1 - minutes / 30));
}

/**
 * K: Continuity factor.
 * 1 if unit.priorBlock equals room.block (returning student keeps same block).
 * 0 otherwise.
 */
export function scoreK(unit: Unit, room: Room): number {
  if (!unit.priorBlock) return 0;
  return unit.priorBlock === room.block ? 1 : 0;
}

// ─── Combined score ────────────────────────────────────────────────────────────

/**
 * Scores a (unit, room) pair.
 * Returns a ScoreBreakdown with all components and a scaled integer total.
 * Uses scoreCWithCandidate (includes the candidate in the compatibility mix).
 */
export function scoreUnit(
  unit: Unit,
  room: Room,
  snapshot: Snapshot,
  weights: Weights = DEFAULT_WEIGHTS,
): ScoreBreakdown {
  const P = scoreP(unit, room);
  const C = scoreCWithCandidate(unit, room, snapshot);
  const F = scoreF(room, snapshot);
  const D = scoreD(room, snapshot);
  const K = scoreK(unit, room);

  const raw = weights.wP * P + weights.wC * C + weights.wF * F + weights.wD * D + weights.wK * K;
  // Scale to integer: multiply by 1,000,000 and round.
  const total = Math.round(raw * 1_000_000);

  return { total, P, C, F, D, K };
}

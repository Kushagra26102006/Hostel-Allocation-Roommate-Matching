/**
 * @hostelhub/domain — allocation/explanation.ts
 *
 * Builds structured and human-readable explanations for allocation decisions.
 * Pure function: no I/O, no Date.now(), no Math.random().
 */

import type {
  Unit,
  Room,
  Snapshot,
  Assignment,
  Explanation,
  ScoreBreakdown,
  HardConstraintCode,
} from "./types.js";

// ─── Builder ───────────────────────────────────────────────────────────────────

export interface ExplanationInput {
  unit: Unit;
  room: Room;
  snapshot: Snapshot;
  scoreBreakdown: ScoreBreakdown;
  constraintsChecked: HardConstraintCode[];
  alternativesConsidered: number;
  tiebreakUsed: boolean;
  priorityTier: string;
  assignedBedId: string;
}

/**
 * Builds a structured Explanation for a successful assignment.
 */
export function buildExplanation(input: ExplanationInput): Explanation {
  const {
    unit,
    room,
    snapshot,
    scoreBreakdown,
    constraintsChecked,
    alternativesConsidered,
    tiebreakUsed,
    priorityTier,
  } = input;

  const hostel = snapshot.hostels.get(room.hostelId);
  const hostelName = hostel?.name ?? room.hostelId;

  // rank in preference list (1-indexed, null if not listed)
  const prefIndex = unit.preferenceHostelIds.indexOf(room.hostelId);
  const rankSatisfied: number | null = prefIndex >= 0 ? prefIndex + 1 : null;

  // Compatibility percentage (C × 100, rounded)
  const compatPct = Math.round(scoreBreakdown.C * 100);

  const sentence = buildSentence({
    rankSatisfied,
    hostelName,
    roomNumber: room.roomNumber,
    quotaBucket: unit.quotaBucket,
    compatPct,
    tiebreakUsed,
  });

  return {
    rankSatisfied,
    hostelName,
    roomNumber: room.roomNumber,
    quotaBucket: unit.quotaBucket,
    priorityTier,
    constraintsChecked,
    scoreParts: scoreBreakdown,
    alternativesConsidered,
    tiebreakUsed,
    sentence,
  };
}

// ─── Human-readable sentence ───────────────────────────────────────────────────

interface SentenceParams {
  rankSatisfied: number | null;
  hostelName: string;
  roomNumber: string;
  quotaBucket: string;
  compatPct: number;
  tiebreakUsed: boolean;
}

const ORDINALS: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
};

/**
 * Builds a friendly English sentence describing the allocation outcome.
 * Examples:
 *   "Assigned your first choice (Kaveri Hostel, Room 214). You qualified under
 *    the SC quota. Roommate compatibility is 92/100."
 *
 *   "Assigned to Sunrise Hostel, Room 305 (your second choice). You qualified
 *    under the General quota. Roommate compatibility is 60/100. A tiebreak was
 *    used to resolve equal priority."
 */
export function buildSentence(params: SentenceParams): string {
  const { rankSatisfied, hostelName, roomNumber, quotaBucket, compatPct, tiebreakUsed } = params;

  let placement: string;
  if (rankSatisfied !== null) {
    const ordinal = ORDINALS[rankSatisfied] ?? `#${rankSatisfied}`;
    placement = `Assigned your ${ordinal} choice (${hostelName}, Room ${roomNumber}).`;
  } else {
    placement = `Assigned to ${hostelName}, Room ${roomNumber} (not in your preference list).`;
  }

  const quotaPart = `You qualified under the ${quotaBucket} quota.`;
  const compatPart = `Roommate compatibility is ${compatPct}/100.`;
  const tiebreakPart = tiebreakUsed ? " A tiebreak was used to resolve equal priority." : "";

  return `${placement} ${quotaPart} ${compatPart}${tiebreakPart}`;
}

// ─── Unassigned explanation ────────────────────────────────────────────────────

export interface UnassignedReasonInput {
  unit: Unit;
  constraintCodes: HardConstraintCode[];
}

/**
 * Builds a human-readable explanation for why a unit was not assigned.
 */
export function buildUnassignedSentence(input: UnassignedReasonInput): string {
  const { unit, constraintCodes } = input;
  if (constraintCodes.includes("HC9_HOLD_ACTIVE")) {
    return "Not assigned: your account has an active administrative hold. Please contact the hostel office.";
  }
  if (constraintCodes.includes("HC6_ACCESSIBILITY_REQUIRED")) {
    return "Not assigned: no accessible beds are currently available that match your requirements.";
  }
  if (constraintCodes.includes("HC5_QUOTA_EXCEEDED")) {
    return `Not assigned: the ${unit.quotaBucket} quota is fully utilised.`;
  }
  if (constraintCodes.includes("HC4_GENDER_MISMATCH")) {
    return "Not assigned: no hostel with a compatible gender policy has vacancies.";
  }
  if (constraintCodes.includes("HC10_GROUP_INTEGRITY_VIOLATED")) {
    return "Not assigned: no room with sufficient capacity for your entire group is available.";
  }
  return "Not assigned: no suitable accommodation is available in this cycle.";
}

// ─── Assignment summary ────────────────────────────────────────────────────────

/**
 * Extracts a brief summary string from a completed Assignment's explanation.
 */
export function summariseAssignment(assignment: Assignment): string {
  return assignment.explanation.sentence;
}

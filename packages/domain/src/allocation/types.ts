/**
 * @hostelhub/domain — allocation/types.ts
 *
 * Core type definitions for the hostel allocation engine.
 * Pure TypeScript: no I/O, no Date, no Math.random().
 */

import type { QuestionnaireAnswers } from "../compatibility/types.js";

// ─── Primitives ────────────────────────────────────────────────────────────────

export type Gender = "male" | "female";
export type GenderPolicy = "male" | "female" | "coed";
export type BedStatus = "available" | "reserved" | "occupied" | "out_of_service";
export type RoomType = "single" | "double" | "triple" | "quad" | "dorm";

// ─── Inventory ─────────────────────────────────────────────────────────────────

export interface Hostel {
  id: string;
  name: string;
  genderPolicy: GenderPolicy;
  /** Distance from academic block in minutes (for D score). */
  walkingMinutes: number;
}

export interface Room {
  id: string;
  hostelId: string;
  roomNumber: string;
  roomType: RoomType;
  capacity: number;
  block: string;
  floor: number;
  accessible: boolean;
  /** Optional quota bucket this room is assigned to (e.g. "SC", "OBC", "General"). */
  quotaBucket?: string;
  /** If set, only units with this fee category may be placed here. */
  feeCategoryRequirement?: string;
  /** If set, only units whose programme matches may be placed here. */
  programmeFilter?: string[];
  /** Distance from academic block in minutes — overrides Hostel.walkingMinutes when set. */
  walkingMinutes?: number;
}

export interface Bed {
  id: string;
  roomId: string;
  status: BedStatus;
  accessible: boolean;
  /** ISO timestamp until which this bed is reserved for accessibility candidates. */
  accessibilityReservedUntil?: string;
  /** If occupied, which unit is assigned here. */
  occupiedByUnitId?: string;
}

// ─── Units ─────────────────────────────────────────────────────────────────────

/**
 * A Unit represents either a single student or a confirmed group.
 * The engine treats both identically — a group has size > 1 and requires
 * that many adjacent beds in the same room.
 */
export interface Unit {
  id: string;
  /** Underlying student IDs (length 1 for individuals). */
  memberIds: readonly string[];
  gender: Gender;
  programme: string;
  year: number;
  feeCategory: string;
  quotaBucket: string;
  hasHold: boolean;
  accessibilityNeed: boolean;
  /** Ordered list of preferred hostel IDs (index 0 = first choice). */
  preferenceHostelIds: readonly string[];
  /** Questionnaire answers (merged for groups — representative member's or averaged). */
  questionnaire: QuestionnaireAnswers;
  /** Block the unit occupied in the previous cycle, for the K (continuity) score. */
  priorBlock?: string;
  /** Group ID if part of a confirmed group booking. */
  groupId?: string;
  /** Mutual deal-breaker unit IDs — pairs that opted into HC11. */
  dealBreakerUnitIds?: readonly string[];
}

// ─── Snapshot ──────────────────────────────────────────────────────────────────

/**
 * Immutable system state passed into every pure engine function.
 * The engine must NOT mutate this; it produces new snapshots or delta records.
 */
export interface Snapshot {
  readonly cycleId: string;
  readonly hostels: ReadonlyMap<string, Hostel>;
  readonly rooms: ReadonlyMap<string, Room>;
  readonly beds: ReadonlyMap<string, Bed>;
  readonly units: ReadonlyMap<string, Unit>;
  /**
   * Quota budgets: quotaBucket → maximum units allowed.
   * Engine tracks usage against this.
   */
  readonly quotaBudget: ReadonlyMap<string, number>;
  /**
   * Quota usage so far in the current run: quotaBucket → units already assigned.
   */
  readonly quotaUsage: ReadonlyMap<string, number>;
  /**
   * Current assignments: bedId → unitId.
   */
  readonly assignments: ReadonlyMap<string, string>;
  /**
   * ISO timestamp of the snapshot (used to evaluate accessibilityReservedUntil).
   * Must be provided externally — engine does not call Date.now().
   */
  readonly nowIso: string;
}

// ─── Weights & Scoring ─────────────────────────────────────────────────────────

/** Scoring weights for the linear combination S = wP*P + wC*C + wF*F + wD*D + wK*K. */
export interface Weights {
  /** Preference rank satisfaction weight. Default: 0.45 */
  wP: number;
  /** Roommate compatibility weight. Default: 0.30 */
  wC: number;
  /** Room-fill factor weight. Default: 0.10 */
  wF: number;
  /** Distance / proximity weight. Default: 0.10 */
  wD: number;
  /** Continuity (returning student keeps block) weight. Default: 0.05 */
  wK: number;
}

export const DEFAULT_WEIGHTS: Readonly<Weights> = {
  wP: 0.45,
  wC: 0.3,
  wF: 0.1,
  wD: 0.1,
  wK: 0.05,
};

/**
 * Score breakdown for a (unit, room) pair.
 * All values are integers scaled by 1,000,000 to avoid floating-point drift.
 * The raw (0..1) components are stored alongside for explanation.
 */
export interface ScoreBreakdown {
  /** Scaled integer total (0..1,000,000). */
  total: number;
  /** Preference satisfaction (0..1). */
  P: number;
  /** Roommate compatibility (0..1). */
  C: number;
  /** Fill factor (0, 0.5, or 1). */
  F: number;
  /** Proximity factor (0..1). */
  D: number;
  /** Continuity factor (0 or 1). */
  K: number;
}

// ─── Constraints ───────────────────────────────────────────────────────────────

export interface ConstraintResult {
  ok: boolean;
  reasonCode: string;
}

export type HardConstraintCode =
  | "HC1_ALREADY_ASSIGNED"
  | "HC2_BED_OCCUPIED"
  | "HC3_BED_UNAVAILABLE"
  | "HC4_GENDER_MISMATCH"
  | "HC5_QUOTA_EXCEEDED"
  | "HC5_QUOTA_SPILLOVER_ALLOWED"
  | "HC6_ACCESSIBILITY_REQUIRED"
  | "HC6_ACCESSIBLE_BED_RESERVED"
  | "HC7_PROGRAMME_MISMATCH"
  | "HC8_FEE_CATEGORY_MISMATCH"
  | "HC9_HOLD_ACTIVE"
  | "HC10_GROUP_INTEGRITY_VIOLATED"
  | "HC11_DEALBREAKER_CONFLICT"
  | "OK";

// ─── Output ────────────────────────────────────────────────────────────────────

export interface Assignment {
  unitId: string;
  bedId: string;
  roomId: string;
  hostelId: string;
  score: number;
  tiebreakKey: number;
  explanation: Explanation;
}

export interface Explanation {
  rankSatisfied: number | null;
  hostelName: string;
  roomNumber: string;
  quotaBucket: string;
  priorityTier: string;
  constraintsChecked: HardConstraintCode[];
  scoreParts: ScoreBreakdown;
  alternativesConsidered: number;
  tiebreakUsed: boolean;
  sentence: string;
}

export interface RunMetrics {
  cycleId: string;
  /** FNV-1a hash of the canonical snapshot JSON (sorted keys). */
  inputHash: string;
  totalUnits: number;
  assigned: number;
  unassigned: number;
  /** Units rejected before the assignment loop (e.g. hold active). */
  rejected: number;
  constraintViolations: number;
  /** ms elapsed — supplied externally; engine itself does not call Date. */
  durationMs: number;
  /** Fraction of assigned units that received their first-choice hostel (0..1). */
  firstChoiceRate: number;
  /** Mean rank position of assigned units (1 = first choice). */
  avgRankSatisfied: number;
  /** Gini coefficient of total scores across assigned units (0 = perfect equality). */
  giniPreferenceScore: number;
  /**
   * Max difference in firstChoiceRate across quota buckets.
   * 0 = identical rates across all buckets.
   */
  categoryParityGap: number;
  /**
   * Number of cases where a lower-priority unit has a better hostel rank than
   * a higher-priority unit in the same quota bucket. Must always be 0 after
   * a valid run.
   */
  priorityInversions: number;
  /** Mean room compatibility score (0..1) across all assigned rooms. */
  meanRoomCompatibility: number;
  /** Minimum room compatibility score (0..1) across all assigned rooms. */
  minRoomCompatibility: number;
}

// ─── Pipeline I/O ──────────────────────────────────────────────────────────────

export interface AllocateOptions {
  /** Seed for the PCG32 PRNG used for deterministic tiebreaking and local search. */
  seed: number;
  weights?: Weights;
  /** Maximum local-search swap iterations. Default: 500. */
  maxIterations?: number;
  /** Called after each pipeline stage with progress info. */
  onProgress?: (stage: string, done: number, total: number) => void;
}

export interface WaitlistEntry {
  unitId: string;
  quotaBucket: string;
  /** The deterministic priority sort key (lower = higher priority). */
  priorityKey: number;
  /** The hard constraint reason code that blocked assignment. */
  reasonCode: string;
  /** Human-readable sentence. */
  sentence: string;
}

export interface RejectedEntry {
  unitId: string;
  /** E.g. HC9_HOLD_ACTIVE. */
  reasonCode: string;
  sentence: string;
}

export interface AllocateResult {
  assignments: Assignment[];
  waitlist: WaitlistEntry[];
  rejected: RejectedEntry[];
  metrics: RunMetrics;
  /** FNV-1a hash of the canonical snapshot input (echoed from metrics). */
  inputHash: string;
}

// ─── Error ──────────────────────────────────────────────────────────────────────

/**
 * Thrown when the pipeline detects a post-assignment invariant violation.
 * The `invariant` field identifies which invariant (P1–P7) was violated.
 */
export class InvariantError extends Error {
  readonly invariant: string;
  readonly details: unknown;

  constructor(invariant: string, message: string, details?: unknown) {
    super(message);
    this.name = "InvariantError";
    this.invariant = invariant;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

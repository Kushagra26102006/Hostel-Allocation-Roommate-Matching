/**
 * @hostelhub/domain — changes/types.ts
 *
 * Domain types for room change requests, atomic swaps, and appeals.
 * Pure TypeScript: no I/O, no Date, no Math.random().
 */

import type { HardConstraintCode, Unit, Bed, Room, Hostel } from "../allocation/types.js";

// ─── Room Change ───────────────────────────────────────────────────────────────

export type RoomChangeStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface RoomChangeInput {
  studentId: string;
  assignmentId: string;
  draftId: string;
  fromBedId: string;
  fromRoomId: string;
  fromHostelId: string;
  toBedId?: string | undefined;
  reason: string;
  evidenceKeys: string[];
}

export interface RoomChangeValidationResult {
  valid: boolean;
  code?: HardConstraintCode | "INVALID_REASON" | undefined;
  error?: string | undefined;
  constraintsChecked: HardConstraintCode[];
}

// ─── Swap ──────────────────────────────────────────────────────────────────────

export type SwapStatus =
  "proposed" | "counterpart_accepted" | "validated" | "completed" | "failed" | "cancelled";

export interface SwapInput {
  initiatorStudentId: string;
  counterpartStudentId: string;
  draftId: string;
  initiatorAssignmentId: string;
  counterpartAssignmentId: string;
  initiatorBedId: string;
  counterpartBedId: string;
}

export interface SwapSideResult {
  valid: boolean;
  code?: HardConstraintCode | undefined;
  error?: string | undefined;
  constraintsChecked: HardConstraintCode[];
}

export interface SwapValidationResult {
  valid: boolean;
  sideA: SwapSideResult;
  sideB: SwapSideResult;
}

// ─── Appeals ───────────────────────────────────────────────────────────────────

export type AppealStatus =
  "submitted" | "warden_review" | "chief_warden_review" | "upheld" | "partly_upheld" | "rejected";

export type AppealOutcome = "upheld" | "partly_upheld" | "rejected";

export interface AppealInput {
  studentId: string;
  assignmentId: string;
  draftId: string;
  statement: string;
  evidenceKeys: string[];
}

export interface AppealDecision {
  outcome: AppealOutcome;
  reason: string;
  decidedBy: string;
  decidedAt: string;
}

export interface AppealEscalationResult {
  appealId: string;
  previousStatus: AppealStatus;
  newStatus: AppealStatus;
  reason: string;
  escalatedAt: string;
}

// ─── SLA ───────────────────────────────────────────────────────────────────────

export interface SlaConfig {
  /** Number of working days (Mon–Fri) for the SLA. Default: 3. */
  workingDays: number;
  /** Optional list of holiday ISO date strings (YYYY-MM-DD) to skip. */
  holidays?: string[] | undefined;
}

export const DEFAULT_SLA_CONFIG: Readonly<SlaConfig> = {
  workingDays: 3,
  holidays: [],
};

// ─── Shared Validation Context ─────────────────────────────────────────────────

export interface ChangeValidationContext {
  unit: Unit;
  fromBed: Bed;
  toBed: Bed;
  toRoom: Room;
  toHostel: Hostel;
  /** Units currently occupying beds in the target room */
  targetRoomOccupants: Unit[];
}

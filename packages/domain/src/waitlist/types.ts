/**
 * @hostelhub/domain — waitlist/types.ts
 *
 * Types for waiting list management, promotion candidates, policy controls,
 * and reconciliation metrics.
 */

import type { HardConstraintCode, Unit, Bed, Room, Hostel } from "../allocation/types.js";

export type PromotionPolicy = "auto_confirm" | "proposal_required";

export type PromotionTrigger =
  | "withdrawal"
  | "no_show"
  | "override_freed"
  | "appeal_granted"
  | "room_change_approved"
  | "manual";

export type WaitlistEntryStatus =
  "waiting" | "promoted" | "proposal_pending" | "skipped" | "withdrawn";

export interface WaitlistUnitMember {
  id: string;
  applicationId: string;
  name: string;
  gender: "male" | "female" | "other";
  hasAccessibilityNeed: boolean;
  priorityScore: number;
  programme?: string;
  year?: number;
}

export interface WaitlistUnit {
  id: string; // unitId (usually smallest student ID or group ID)
  groupId?: string;
  members: WaitlistUnitMember[];
  quotaBucket: string;
  priorityScore: number;
  policyTier: number;
  position: number;
  status: WaitlistEntryStatus;
  waitingReasonCode?: string; // e.g. "QUOTA_EXHAUSTED", "ROOM_TYPE_UNAVAILABLE", "ACCESSIBLE_BED_FULL"
  reorderHistory?: Array<{
    previousPosition: number;
    newPosition: number;
    reason: string;
    actor: { id: string; email: string; role: string };
    timestamp: string;
  }>;
}

export interface SkippedUnitReason {
  unitId: string;
  unitPosition: number;
  reasonCode: HardConstraintCode | "GROUP_DOES_NOT_FIT" | "ACCESSIBILITY_MISMATCH";
  message: string;
}

export interface PromotionCandidateResult {
  unit: WaitlistUnit | null;
  targetBeds: Bed[];
  skippedUnits: SkippedUnitReason[];
}

export interface PromotionContext {
  vacatedBed: Bed;
  vacatedRoom: Room;
  vacatedHostel: Hostel;
  availableBedsInRoom: Bed[];
  currentRoomOccupantUnits: Unit[];
  allWaitlistedUnits: WaitlistUnit[];
  quotaBucket?: string;
}

export interface ReorderQueueResult {
  updatedEntries: WaitlistUnit[];
  movedEntry: WaitlistUnit;
  previousPosition: number;
  newPosition: number;
}

export interface OccupancyRecord {
  roomId: string;
  roomNumber: string;
  capacity: number;
  allocatedCount: number;
  isFull: boolean;
}

export interface ReconciliationReport {
  totalHostelCapacity: number;
  totalAllocated: number;
  totalAvailable: number;
  roomReports: OccupancyRecord[];
  isExactMatch: boolean;
  discrepancies: Array<{
    roomId: string;
    expected: number;
    actual: number;
  }>;
}

/**
 * @hostelhub/domain — review/override-validator.ts
 *
 * Validates manual staff overrides on draft assignments.
 * Enforces:
 *   - Mandatory reason >= 10 characters.
 *   - Hard constraint validation for target bed & room.
 *   - Mutual deal-breaker check with all prospective roommates.
 *   - Automatic escalation tagging (accessibility, quota, cross-hostel, group breakups).
 */

import type { Bed, Room, Hostel, Unit, HardConstraintCode } from "../allocation/types.js";
import { dealBreakerConflict } from "../compatibility/scoring.js";

export interface OverrideInput {
  draftId: string;
  assignmentId: string;
  applicationId: string;
  studentId: string;
  fromBedId: string;
  toBedId: string;
  reason: string;
}

export interface OverrideValidationContext {
  unit: Unit;
  fromBed: Bed;
  fromHostelId: string;
  toBed: Bed;
  toRoom: Room;
  toHostel: Hostel;
  /** Units currently assigned to beds in the target room in this draft */
  targetRoomOccupants: Unit[];
  /** Is the target bed currently assigned to someone in this draft? */
  targetBedOccupantUnitId?: string | undefined;
}

export interface OverrideValidationResult {
  valid: boolean;
  code?: HardConstraintCode | "INVALID_REASON" | "BED_OCCUPIED" | undefined;
  error?: string | undefined;
  escalated: boolean;
  escalationReasons: string[];
}

/**
 * Pure function: validates an override request and determines if maker-checker escalation is triggered.
 */
export function validateOverride(
  input: OverrideInput,
  ctx: OverrideValidationContext,
): OverrideValidationResult {
  const escalationReasons: string[] = [];

  // 1. Mandatory reason check (>= 10 characters)
  if (!input.reason || input.reason.trim().length < 10) {
    return {
      valid: false,
      code: "INVALID_REASON",
      error: "Override reason is mandatory and must be at least 10 characters long.",
      escalated: false,
      escalationReasons: [],
    };
  }

  // 2. Target bed occupancy check
  if (
    (ctx.targetBedOccupantUnitId && ctx.targetBedOccupantUnitId !== ctx.unit.id) ||
    (ctx.toBed.occupiedByUnitId && ctx.toBed.occupiedByUnitId !== ctx.unit.id) ||
    ctx.toBed.status === "occupied"
  ) {
    return {
      valid: false,
      code: "BED_OCCUPIED",
      error: `Target bed '${ctx.toBed.id}' is already occupied.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  // 3. HC9: Disciplinary or administrative hold
  if (ctx.unit.hasHold) {
    return {
      valid: false,
      code: "HC9_HOLD_ACTIVE",
      error: `Applicant '${ctx.unit.id}' has an active hold and cannot be assigned a bed.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  // 4. HC3: Target bed active status & room capacity
  if (ctx.toBed.status !== "available") {
    return {
      valid: false,
      code: "HC3_BED_UNAVAILABLE",
      error: `Target bed '${ctx.toBed.id}' status is '${ctx.toBed.status}'.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  const currentOccupantsCount = ctx.targetRoomOccupants.reduce(
    (acc, u) => acc + u.memberIds.length,
    0,
  );
  if (currentOccupantsCount + ctx.unit.memberIds.length > ctx.toRoom.capacity) {
    return {
      valid: false,
      code: "HC3_BED_UNAVAILABLE",
      error: `Assigning unit '${ctx.unit.id}' exceeds room '${ctx.toRoom.id}' capacity of ${ctx.toRoom.capacity}.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  // 5. HC4: Gender policy check
  if (ctx.toHostel.genderPolicy !== "coed" && ctx.toHostel.genderPolicy !== ctx.unit.gender) {
    return {
      valid: false,
      code: "HC4_GENDER_MISMATCH",
      error: `Unit gender '${ctx.unit.gender}' violates hostel '${ctx.toHostel.name}' gender policy '${ctx.toHostel.genderPolicy}'.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  // 6. HC6: Accessibility check
  if (ctx.unit.accessibilityNeed && !ctx.toBed.accessible) {
    return {
      valid: false,
      code: "HC6_ACCESSIBILITY_REQUIRED",
      error: `Applicant requires an accessible bed, but target bed '${ctx.toBed.id}' is not accessible.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  // 7. HC5: Quota bucket check
  if (
    ctx.toRoom.quotaBucket &&
    ctx.toRoom.quotaBucket !== "General" &&
    ctx.toRoom.quotaBucket !== ctx.unit.quotaBucket
  ) {
    return {
      valid: false,
      code: "HC5_QUOTA_EXCEEDED",
      error: `Room '${ctx.toRoom.id}' is reserved for quota '${ctx.toRoom.quotaBucket}', which does not match unit '${ctx.unit.quotaBucket}'.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  // 8. HC7: Programme filter check
  if (
    ctx.toRoom.programmeFilter &&
    ctx.toRoom.programmeFilter.length > 0 &&
    !ctx.toRoom.programmeFilter.includes(ctx.unit.programme)
  ) {
    return {
      valid: false,
      code: "HC7_PROGRAMME_MISMATCH",
      error: `Unit programme '${ctx.unit.programme}' is not permitted in room '${ctx.toRoom.id}'.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  // 9. HC8: Fee category requirement
  if (
    ctx.toRoom.feeCategoryRequirement &&
    ctx.toRoom.feeCategoryRequirement !== ctx.unit.feeCategory
  ) {
    return {
      valid: false,
      code: "HC8_FEE_CATEGORY_MISMATCH",
      error: `Unit fee category '${ctx.unit.feeCategory}' does not match room '${ctx.toRoom.id}' required '${ctx.toRoom.feeCategoryRequirement}'.`,
      escalated: false,
      escalationReasons: [],
    };
  }

  // 10. HC11: Mutual deal-breaker conflicts
  for (const roommate of ctx.targetRoomOccupants) {
    const isConflict =
      Boolean(
        ctx.unit.dealBreakerUnitIds?.includes(roommate.id) ||
        roommate.dealBreakerUnitIds?.includes(ctx.unit.id),
      ) ||
      Boolean(
        ctx.unit.questionnaire &&
        roommate.questionnaire &&
        dealBreakerConflict(ctx.unit.questionnaire, roommate.questionnaire),
      );

    if (isConflict) {
      return {
        valid: false,
        code: "HC11_DEALBREAKER_CONFLICT",
        error: `Mutual deal-breaker conflict detected with roommate '${roommate.id}'.`,
        escalated: false,
        escalationReasons: [],
      };
    }
  }

  // ── Escalation checks (Maker-Checker trigger) ──────────────────────────────
  if (ctx.unit.accessibilityNeed || ctx.fromBed.accessible || ctx.toBed.accessible) {
    escalationReasons.push(
      "Override involves an accessible bed or applicant with accessibility requirements.",
    );
  }

  if (
    (ctx.toRoom.quotaBucket && ctx.toRoom.quotaBucket !== "General") ||
    ctx.unit.quotaBucket !== "General"
  ) {
    escalationReasons.push(
      `Override touches affirmative quota allocation ('${ctx.unit.quotaBucket}').`,
    );
  }

  if (ctx.fromHostelId !== ctx.toHostel.id) {
    escalationReasons.push(
      `Cross-hostel transfer from '${ctx.fromHostelId}' to '${ctx.toHostel.id}'.`,
    );
  }

  if (ctx.unit.memberIds.length > 1) {
    escalationReasons.push(
      "Override separates an individual member of a confirmed roommate group.",
    );
  }

  const escalated = escalationReasons.length > 0;

  return {
    valid: true,
    escalated,
    escalationReasons,
  };
}

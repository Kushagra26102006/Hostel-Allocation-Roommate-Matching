/**
 * @hostelhub/domain — changes/room-change-validator.ts
 *
 * Pure function that revalidates ALL hard constraints (HC3–HC11)
 * when a room change is approved. Identical predicates to override-validator.ts,
 * extracted here for the room-change and appeal workflows.
 */

import type { HardConstraintCode } from "../allocation/types.js";
import type { ChangeValidationContext, RoomChangeValidationResult } from "./types.js";
import { dealBreakerConflict } from "../compatibility/scoring.js";

/**
 * Validates whether a student can move from their current bed to a target bed,
 * checking every hard constraint. Returns detailed result for audit.
 */
export function validateRoomChange(ctx: ChangeValidationContext): RoomChangeValidationResult {
  const constraintsChecked: HardConstraintCode[] = [];

  // HC9: Disciplinary or administrative hold
  constraintsChecked.push("HC9_HOLD_ACTIVE");
  if (ctx.unit.hasHold) {
    return {
      valid: false,
      code: "HC9_HOLD_ACTIVE",
      error: `Student unit '${ctx.unit.id}' has an active hold and cannot be moved.`,
      constraintsChecked,
    };
  }

  // HC3: Target bed availability and room capacity
  constraintsChecked.push("HC3_BED_UNAVAILABLE");
  if (ctx.toBed.status !== "available" && ctx.toBed.id !== ctx.fromBed.id) {
    return {
      valid: false,
      code: "HC3_BED_UNAVAILABLE",
      error: `Target bed '${ctx.toBed.id}' status is '${ctx.toBed.status}'.`,
      constraintsChecked,
    };
  }

  const currentOccupantsCount = ctx.targetRoomOccupants.reduce(
    (acc, u) => acc + u.memberIds.length,
    0,
  );
  // Don't count the moving unit if they are already counted in target occupants
  const unitAlreadyInTarget = ctx.targetRoomOccupants.some((u) => u.id === ctx.unit.id);
  const effectiveCount = unitAlreadyInTarget
    ? currentOccupantsCount
    : currentOccupantsCount + ctx.unit.memberIds.length;
  if (effectiveCount > ctx.toRoom.capacity) {
    return {
      valid: false,
      code: "HC3_BED_UNAVAILABLE",
      error: `Moving unit '${ctx.unit.id}' exceeds room '${ctx.toRoom.id}' capacity of ${ctx.toRoom.capacity}.`,
      constraintsChecked,
    };
  }

  // HC4: Gender policy
  constraintsChecked.push("HC4_GENDER_MISMATCH");
  if (ctx.toHostel.genderPolicy !== "coed" && ctx.toHostel.genderPolicy !== ctx.unit.gender) {
    return {
      valid: false,
      code: "HC4_GENDER_MISMATCH",
      error: `Unit gender '${ctx.unit.gender}' violates hostel '${ctx.toHostel.name}' gender policy '${ctx.toHostel.genderPolicy}'.`,
      constraintsChecked,
    };
  }

  // HC6: Accessibility
  constraintsChecked.push("HC6_ACCESSIBILITY_REQUIRED");
  if (ctx.unit.accessibilityNeed && !ctx.toBed.accessible) {
    return {
      valid: false,
      code: "HC6_ACCESSIBILITY_REQUIRED",
      error: `Student requires an accessible bed, but target bed '${ctx.toBed.id}' is not accessible.`,
      constraintsChecked,
    };
  }

  // HC5: Quota bucket
  constraintsChecked.push("HC5_QUOTA_EXCEEDED");
  if (
    ctx.toRoom.quotaBucket &&
    ctx.toRoom.quotaBucket !== "General" &&
    ctx.toRoom.quotaBucket !== ctx.unit.quotaBucket
  ) {
    return {
      valid: false,
      code: "HC5_QUOTA_EXCEEDED",
      error: `Room '${ctx.toRoom.id}' is reserved for quota '${ctx.toRoom.quotaBucket}', does not match '${ctx.unit.quotaBucket}'.`,
      constraintsChecked,
    };
  }

  // HC7: Programme filter
  constraintsChecked.push("HC7_PROGRAMME_MISMATCH");
  if (
    ctx.toRoom.programmeFilter &&
    ctx.toRoom.programmeFilter.length > 0 &&
    !ctx.toRoom.programmeFilter.includes(ctx.unit.programme)
  ) {
    return {
      valid: false,
      code: "HC7_PROGRAMME_MISMATCH",
      error: `Unit programme '${ctx.unit.programme}' is not permitted in room '${ctx.toRoom.id}'.`,
      constraintsChecked,
    };
  }

  // HC8: Fee category
  constraintsChecked.push("HC8_FEE_CATEGORY_MISMATCH");
  if (
    ctx.toRoom.feeCategoryRequirement &&
    ctx.toRoom.feeCategoryRequirement !== ctx.unit.feeCategory
  ) {
    return {
      valid: false,
      code: "HC8_FEE_CATEGORY_MISMATCH",
      error: `Unit fee category '${ctx.unit.feeCategory}' does not match room '${ctx.toRoom.id}' required '${ctx.toRoom.feeCategoryRequirement}'.`,
      constraintsChecked,
    };
  }

  // HC11: Mutual deal-breaker conflicts
  constraintsChecked.push("HC11_DEALBREAKER_CONFLICT");
  for (const roommate of ctx.targetRoomOccupants) {
    if (roommate.id === ctx.unit.id) continue; // skip self
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
        constraintsChecked,
      };
    }
  }

  return {
    valid: true,
    constraintsChecked,
  };
}

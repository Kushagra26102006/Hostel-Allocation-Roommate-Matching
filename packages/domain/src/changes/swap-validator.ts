/**
 * @hostelhub/domain — changes/swap-validator.ts
 *
 * Pure function that validates a two-way room swap.
 * Both directions must pass all hard constraints for the swap to be valid.
 * If either side fails, the entire swap fails atomically.
 */

import type { Unit, Bed, Room, Hostel, HardConstraintCode } from "../allocation/types.js";
import type { SwapValidationResult, SwapSideResult } from "./types.js";
import { validateRoomChange } from "./room-change-validator.js";

export interface SwapValidationContext {
  unitA: Unit;
  bedA: Bed;
  roomA: Room;
  hostelA: Hostel;
  /** Other occupants in room A, excluding unit A */
  occupantsA: Unit[];

  unitB: Unit;
  bedB: Bed;
  roomB: Room;
  hostelB: Hostel;
  /** Other occupants in room B, excluding unit B */
  occupantsB: Unit[];
}

/**
 * Validates both directions of a swap:
 *   A → B's bed (validate A moving into room B)
 *   B → A's bed (validate B moving into room A)
 *
 * Both must pass for the swap to succeed.
 */
export function validateSwap(ctx: SwapValidationContext): SwapValidationResult {
  // Side A: unit A moves to bed B, room B, hostel B
  // Target room occupants for A = occupantsB (unit B will leave, so exclude B)
  const sideAResult = validateRoomChange({
    unit: ctx.unitA,
    fromBed: ctx.bedA,
    toBed: ctx.bedB,
    toRoom: ctx.roomB,
    toHostel: ctx.hostelB,
    targetRoomOccupants: ctx.occupantsB.filter((u) => u.id !== ctx.unitB.id),
  });

  const sideA: SwapSideResult = {
    valid: sideAResult.valid,
    code: sideAResult.code as HardConstraintCode | undefined,
    error: sideAResult.error,
    constraintsChecked: sideAResult.constraintsChecked,
  };

  // Side B: unit B moves to bed A, room A, hostel A
  // Target room occupants for B = occupantsA (unit A will leave, so exclude A)
  const sideBResult = validateRoomChange({
    unit: ctx.unitB,
    fromBed: ctx.bedB,
    toBed: ctx.bedA,
    toRoom: ctx.roomA,
    toHostel: ctx.hostelA,
    targetRoomOccupants: ctx.occupantsA.filter((u) => u.id !== ctx.unitA.id),
  });

  const sideB: SwapSideResult = {
    valid: sideBResult.valid,
    code: sideBResult.code as HardConstraintCode | undefined,
    error: sideBResult.error,
    constraintsChecked: sideBResult.constraintsChecked,
  };

  return {
    valid: sideA.valid && sideB.valid,
    sideA,
    sideB,
  };
}

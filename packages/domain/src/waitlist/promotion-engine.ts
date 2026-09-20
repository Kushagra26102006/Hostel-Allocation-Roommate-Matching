/**
 * @hostelhub/domain — waitlist/promotion-engine.ts
 *
 * Pure algorithmic engine for waitlist promotion and queue reordering.
 * Reuses hard constraint principles (HC1-HC11, group integrity, accessibility, deal-breakers).
 * Zero I/O, deterministic, pure functions.
 */

import type { Bed } from "../allocation/types.js";
import type {
  PromotionCandidateResult,
  PromotionContext,
  WaitlistUnit,
  SkippedUnitReason,
  ReorderQueueResult,
} from "./types.js";

/**
 * Finds the first eligible waitlisted unit for a vacated bed.
 * Evaluates candidate units strictly in priority order.
 * Skips unfit units with detailed reason codes and continues.
 */
export function findPromotionCandidate(ctx: PromotionContext): PromotionCandidateResult {
  const {
    vacatedBed,
    vacatedRoom,
    vacatedHostel,
    availableBedsInRoom,
    currentRoomOccupantUnits,
    allWaitlistedUnits,
    quotaBucket,
  } = ctx;

  const skippedUnits: SkippedUnitReason[] = [];

  // Filter only active waiting units, sorted by position ascending
  let candidates = allWaitlistedUnits
    .filter((u) => u.status === "waiting")
    .sort((a, b) => {
      if (a.position !== b.position) return a.position - b.position;
      return b.priorityScore - a.priorityScore;
    });

  // If a specific quota bucket is targeted, prioritize units matching that quota bucket
  if (quotaBucket) {
    const bucketMatches = candidates.filter((u) => u.quotaBucket === quotaBucket);
    const otherBuckets = candidates.filter((u) => u.quotaBucket !== quotaBucket);
    candidates = [...bucketMatches, ...otherBuckets];
  }

  for (const unit of candidates) {
    const groupSize = unit.members.length;

    // 1. Group Integrity (HC10): All group members must fit in the target room
    if (groupSize > availableBedsInRoom.length) {
      skippedUnits.push({
        unitId: unit.id,
        unitPosition: unit.position,
        reasonCode: "GROUP_DOES_NOT_FIT",
        message: `Group size (${groupSize}) exceeds remaining available beds (${availableBedsInRoom.length}) in room ${vacatedRoom.roomNumber}.`,
      });
      continue;
    }

    // 2. Gender Policy (HC4)
    let genderMismatch = false;
    for (const member of unit.members) {
      if (
        (vacatedHostel.genderPolicy === "male" && member.gender !== "male") ||
        (vacatedHostel.genderPolicy === "female" && member.gender !== "female")
      ) {
        genderMismatch = true;
        break;
      }
    }
    if (genderMismatch) {
      skippedUnits.push({
        unitId: unit.id,
        unitPosition: unit.position,
        reasonCode: "HC4_GENDER_MISMATCH",
        message: `Unit gender does not conform with hostel policy (${vacatedHostel.genderPolicy}).`,
      });
      continue;
    }

    // 3. Accessibility Requirement (HC6)
    const membersNeedingAccessibility = unit.members.filter((m) => m.hasAccessibilityNeed);
    if (membersNeedingAccessibility.length > 0) {
      const accessibleBedsCount = availableBedsInRoom.filter((b) => b.accessible).length;
      if (accessibleBedsCount < membersNeedingAccessibility.length) {
        skippedUnits.push({
          unitId: unit.id,
          unitPosition: unit.position,
          reasonCode: "ACCESSIBILITY_MISMATCH",
          message: `Unit has ${membersNeedingAccessibility.length} member(s) requiring accessible beds, but room only has ${accessibleBedsCount}.`,
        });
        continue;
      }
    }

    // 4. Room Programme Restrictions (HC7)
    let programmeMismatch = false;
    if (vacatedRoom.programmeFilter && vacatedRoom.programmeFilter.length > 0) {
      for (const member of unit.members) {
        if (member.programme && !vacatedRoom.programmeFilter.includes(member.programme)) {
          programmeMismatch = true;
          break;
        }
      }
    }
    if (programmeMismatch) {
      skippedUnits.push({
        unitId: unit.id,
        unitPosition: unit.position,
        reasonCode: "HC7_PROGRAMME_MISMATCH",
        message: `Member programme does not match room ${vacatedRoom.roomNumber} cohort criteria.`,
      });
      continue;
    }

    // 5. Deal-Breakers with Existing Room Occupants (HC11)
    let dealBreakerFound = false;
    for (const occupant of currentRoomOccupantUnits) {
      if (occupant.dealBreakerUnitIds) {
        for (const member of unit.members) {
          if (occupant.dealBreakerUnitIds.includes(member.id)) {
            dealBreakerFound = true;
            break;
          }
        }
      }
      if (dealBreakerFound) break;
    }
    if (dealBreakerFound) {
      skippedUnits.push({
        unitId: unit.id,
        unitPosition: unit.position,
        reasonCode: "HC11_DEALBREAKER_CONFLICT",
        message: `Mutual deal-breaker conflict with an existing roommate in room ${vacatedRoom.roomNumber}.`,
      });
      continue;
    }

    // All hard constraints satisfied: Match selected!
    // If unit needs accessible bed, put the member requiring it in the accessible bed
    let targetBeds: Bed[];
    if (membersNeedingAccessibility.length > 0) {
      const accessibleBeds = availableBedsInRoom.filter((b) => b.accessible);
      const otherBeds = availableBedsInRoom.filter((b) => !b.accessible);
      targetBeds = [...accessibleBeds, ...otherBeds].slice(0, groupSize);
    } else {
      // Prefer assigning vacatedBed first, then other available beds
      const remaining = availableBedsInRoom.filter((b) => b.id !== vacatedBed.id);
      targetBeds = [vacatedBed, ...remaining].slice(0, groupSize);
    }

    return {
      unit,
      targetBeds,
      skippedUnits,
    };
  }

  return {
    unit: null,
    targetBeds: [],
    skippedUnits,
  };
}

/**
 * Reorders a waiting list queue with mandatory administrative reason.
 * Pure function: shifts positions and records reorder audit item.
 */
export function reorderWaitlistQueue(
  entries: WaitlistUnit[],
  unitId: string,
  targetPosition: number,
  reason: string,
  actor: { id: string; email: string; role: string },
): ReorderQueueResult {
  if (!reason || reason.trim().length < 10) {
    throw new Error(
      "Reorder justification reason is mandatory and must be at least 10 characters.",
    );
  }

  const currentIndex = entries.findIndex((e) => e.id === unitId);
  if (currentIndex === -1) {
    throw new Error(`Waitlist unit with id "${unitId}" not found.`);
  }

  const clampedPosition = Math.max(1, Math.min(targetPosition, entries.length));
  const targetIndex = clampedPosition - 1;

  if (currentIndex === targetIndex) {
    const entry = entries[currentIndex]!;
    return {
      updatedEntries: entries,
      movedEntry: entry,
      previousPosition: entry.position,
      newPosition: entry.position,
    };
  }

  const cloned = [...entries];
  const [removed] = cloned.splice(currentIndex, 1);
  if (!removed) {
    throw new Error(`Failed to remove unit ${unitId}`);
  }

  cloned.splice(targetIndex, 0, removed);

  const previousPosition = removed.position;
  const newPosition = clampedPosition;

  const historyItem = {
    previousPosition,
    newPosition,
    reason: reason.trim(),
    actor,
    timestamp: new Date().toISOString(),
  };

  const updatedEntries: WaitlistUnit[] = cloned.map((entry, idx) => {
    const pos = idx + 1;
    if (entry.id === unitId) {
      return {
        ...entry,
        position: pos,
        reorderHistory: [...(entry.reorderHistory ?? []), historyItem],
      };
    }
    return {
      ...entry,
      position: pos,
    };
  });

  const moved = updatedEntries.find((e) => e.id === unitId)!;

  return {
    updatedEntries,
    movedEntry: moved,
    previousPosition,
    newPosition,
  };
}

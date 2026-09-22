/**
 * @hostelhub/domain — inspection/checklist-diff.ts
 *
 * Pure algorithmic logic for room-condition inspection diffing and verification.
 * Compares check-in state to check-out state, highlights differences,
 * and assesses damage liability. Zero I/O.
 */

import type {
  ChecklistCondition,
  ChecklistItemRecord,
  ChecklistItemTemplate,
  ChecklistDiffItem,
  ChecklistDiffReport,
} from "./types.js";

/**
 * Severity ranking for condition states:
 * Missing (3) > Damaged (2) > Fair (1) > Good (0)
 */
export const CONDITION_SEVERITY: Record<ChecklistCondition, number> = {
  good: 0,
  fair: 1,
  damaged: 2,
  missing: 3,
};

/**
 * Checks whether condition worsened from check-in to check-out.
 */
export function isConditionWorsened(
  checkIn: ChecklistCondition,
  checkOut: ChecklistCondition,
): boolean {
  return CONDITION_SEVERITY[checkOut] > CONDITION_SEVERITY[checkIn];
}

/**
 * Default standard campus inspection checklist template.
 * Hostels can configure their own custom checklist items if desired.
 */
export const DEFAULT_HOSTEL_CHECKLIST_TEMPLATE: readonly ChecklistItemTemplate[] = [
  {
    id: "bed_frame_mattress",
    label: "Bed Frame & Mattress",
    category: "furniture",
    defaultCondition: "good",
    required: true,
    description: "Inspect bed frame stability, springs, mattress cover, and foam cleanliness.",
  },
  {
    id: "study_table_chair",
    label: "Study Table & Chair",
    category: "furniture",
    defaultCondition: "good",
    required: true,
    description: "Check table surface, drawers, chair backrest, and leg cushions.",
  },
  {
    id: "wardrobe_almirah",
    label: "Wardrobe / Almirah & Keys",
    category: "furniture",
    defaultCondition: "good",
    required: true,
    description: "Check door hinges, lock mechanism, internal shelves, and hanger rods.",
  },
  {
    id: "ceiling_fan_lights",
    label: "Ceiling Fan & Light Fixtures",
    category: "electrical",
    defaultCondition: "good",
    required: true,
    description: "Verify fan regulator speed control, blade alignment, and tube light operation.",
  },
  {
    id: "electrical_sockets",
    label: "Power Sockets & Switches",
    category: "electrical",
    defaultCondition: "good",
    required: true,
    description: "Test all wall sockets and switches for earthing and physical intactness.",
  },
  {
    id: "windows_mesh_latches",
    label: "Window Glass, Mosquito Mesh & Latches",
    category: "fixtures",
    defaultCondition: "good",
    required: true,
    description: "Inspect window panes, wire mesh integrity, and locking latches.",
  },
  {
    id: "door_lock_keys",
    label: "Door Lock, Handle & Keys",
    category: "fixtures",
    defaultCondition: "good",
    required: true,
    description: "Ensure deadbolt or mortise lock functions smoothly with master and student keys.",
  },
  {
    id: "bathroom_fittings",
    label: "Bathroom Fittings & Water Supply",
    category: "plumbing",
    defaultCondition: "good",
    required: false,
    description: "Check taps, shower, flush valve, and drainage for leaks or clogs.",
  },
] as const;

/**
 * Computes a detailed diff between check-in checklist and check-out checklist.
 * Highlights worsened conditions, missing items, and assesses student liability.
 */
export function computeChecklistDiff(
  checkInItems: readonly ChecklistItemRecord[],
  checkOutItems: readonly ChecklistItemRecord[],
): ChecklistDiffReport {
  const checkInMap = new Map<string, ChecklistItemRecord>();
  for (const item of checkInItems) {
    checkInMap.set(item.itemId, item);
  }

  const allItemIds = new Set<string>([
    ...checkInItems.map((i) => i.itemId),
    ...checkOutItems.map((i) => i.itemId),
  ]);

  const differences: ChecklistDiffItem[] = [];
  let unalteredItems = 0;
  let worsenedItems = 0;
  let improvedItems = 0;
  let hasDamageLiability = false;

  for (const itemId of allItemIds) {
    const inItem = checkInMap.get(itemId);
    const outItem = checkOutItems.find((i) => i.itemId === itemId);

    const checkInCondition: ChecklistCondition = inItem?.condition ?? "good";
    const checkOutCondition: ChecklistCondition = outItem?.condition ?? "missing";
    const label = outItem?.label ?? inItem?.label ?? itemId;
    const category = outItem?.category ?? inItem?.category ?? "general";

    const worsened = isConditionWorsened(checkInCondition, checkOutCondition);
    const severityIn = CONDITION_SEVERITY[checkInCondition];
    const severityOut = CONDITION_SEVERITY[checkOutCondition];

    if (severityIn === severityOut) {
      unalteredItems++;
    } else if (severityOut > severityIn) {
      worsenedItems++;
      hasDamageLiability = true;
    } else {
      improvedItems++;
    }

    if (severityIn !== severityOut || inItem?.notes !== outItem?.notes) {
      differences.push({
        itemId,
        label,
        category,
        checkInCondition,
        checkOutCondition,
        worsened,
        liabilityAssessed: worsened,
        checkInNotes: inItem?.notes,
        checkOutNotes: outItem?.notes,
        checkInPhotoUrl: inItem?.photoUrl,
        checkOutPhotoUrl: outItem?.photoUrl,
      });
    }
  }

  return {
    totalItems: allItemIds.size,
    unalteredItems,
    worsenedItems,
    improvedItems,
    hasDamageLiability,
    differences,
  };
}

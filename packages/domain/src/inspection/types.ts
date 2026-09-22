/**
 * @hostelhub/domain — inspection/types.ts
 *
 * Types for room condition inspection, checklist items, condition diffing,
 * student mobile acknowledgement, and no-show tracking.
 */

export type ChecklistCondition = "good" | "fair" | "damaged" | "missing";

export interface ChecklistItemTemplate {
  id: string;
  label: string;
  category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
  defaultCondition?: ChecklistCondition | undefined;
  required?: boolean | undefined;
  description?: string | undefined;
}

export interface ChecklistItemRecord {
  itemId: string;
  label: string;
  category: "furniture" | "electrical" | "plumbing" | "fixtures" | "general";
  condition: ChecklistCondition;
  notes?: string | undefined;
  photoS3Key?: string | undefined;
  photoUrl?: string | undefined;
}

export interface ChecklistDiffItem {
  itemId: string;
  label: string;
  category: string;
  checkInCondition: ChecklistCondition;
  checkOutCondition: ChecklistCondition;
  worsened: boolean;
  liabilityAssessed: boolean;
  checkInNotes?: string | undefined;
  checkOutNotes?: string | undefined;
  checkInPhotoUrl?: string | undefined;
  checkOutPhotoUrl?: string | undefined;
}

export interface ChecklistDiffReport {
  totalItems: number;
  unalteredItems: number;
  worsenedItems: number;
  improvedItems: number;
  hasDamageLiability: boolean;
  differences: ChecklistDiffItem[];
}

export interface StudentAcknowledgementData {
  acknowledged: boolean;
  acknowledgedAt?: string | undefined;
  studentNotes?: string | undefined;
  signatureHash?: string | undefined;
}

export interface OfflineCheckInPayload {
  clientSyncId: string;
  tokenOrCode: string;
  scannedAt: string;
  checklist: ChecklistItemRecord[];
  notes?: string | undefined;
}

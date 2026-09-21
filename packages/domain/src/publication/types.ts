/**
 * @hostelhub/domain — publication/types.ts
 *
 * Types for Ed25519 verification tokens, allocation letters,
 * public verification responses, and batch processing.
 */

export interface VerificationTokenHeader {
  alg: "EdDSA";
  crv: "Ed25519";
  kid: string;
}

export interface VerificationTokenPayload {
  /** Letter ID or unique identifier */
  lid: string;
  /** SHA-256 hash of the assignment ID (first 32 hex chars or full hash) */
  ah: string;
  /** Unix timestamp in seconds or milliseconds when issued */
  iat: number;
  /** Issuer / institution identifier or abbreviation */
  iss: string;
  /** Optional expiry timestamp */
  exp?: number | undefined;
}

export interface VerificationTokenResult {
  valid: boolean;
  reason?: "tampered" | "expired" | "unknown_kid" | "invalid_format" | undefined;
  institution?: string | undefined;
  issuedAt?: string | undefined;
  letterId?: string | undefined;
  kid?: string | undefined;
}

export interface AllocationLetterData {
  letterId: string;
  letterNumber: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  rollNumber: string;
  institutionId: string;
  institutionName: string;
  institutionLogoUrl?: string | undefined;
  draftId: string;
  cycleName: string;
  academicYear: string;
  hostelName: string;
  blockName: string;
  floorNumber: number;
  roomNumber: string;
  bedNo: string;
  issuedDate: string;
  moveInStartDate: string;
  moveInEndDate: string;
  token: string;
  qrDataUrl?: string | undefined;
  termsVersion: string;
}

export interface LetterBatchProgress {
  draftId: string;
  total: number;
  generated: number;
  failed: number;
  pending: number;
  percent: number;
  isComplete: boolean;
  error?: string | undefined;
}

export interface StudentResultRoommate {
  name: string;
  rollNumber?: string | undefined;
  bedNo: string;
  isConsented: boolean;
}

export interface StudentResultData {
  hasAllocation: boolean;
  status: "published" | "draft" | "unallocated";
  assignmentId?: string | undefined;
  letterId?: string | undefined;
  letterDownloadUrl?: string | undefined;
  hostel: {
    name: string;
    block: string;
    floor: number;
    roomNumber: string;
    bedNo: string;
    roomType: string;
  };
  score: number;
  compatibilityPercent: number;
  whyThisRoom: string;
  moveInDate: string;
  checkInWindow: string;
  roommates: StudentResultRoommate[];
  verificationToken?: string | undefined;
}

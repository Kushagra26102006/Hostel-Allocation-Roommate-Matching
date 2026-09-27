/**
 * HostelHub Core Domain Types & API Contracts
 * Centralized domain definitions matching P03 system architecture.
 */

export type Role = "student" | "warden" | "chief_warden" | "hostel_admin" | "dean" | "sys_admin";

export interface User {
  id: string;
  name: string;
  email: string;
  rollNo?: string;
  roles: Role[];
  activeRole: Role;
  status: "active" | "suspended" | "pending";
  mfaEnabled: boolean;
  mfaPending?: boolean;
  avatarUrl?: string;
}

export type Gender = "male" | "female" | "coed";

export interface Hostel {
  id: string;
  code: string;
  name: string;
  gender: Gender;
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  floorsCount: number;
  distanceToCampusMeters: number;
  walkingTimeMins: number;
  hasAC: boolean;
  hasElevator: boolean;
  hasPwDAccess: boolean;
  imageUrl?: string;
}

export interface Block {
  id: string;
  hostelId: string;
  name: string;
  code: string;
  totalFloors: number;
}

export interface Floor {
  id: string;
  blockId: string;
  floorNo: number;
  totalRooms: number;
  totalBeds: number;
}

export type RoomType = "single" | "double" | "triple" | "quad" | "suite";

export interface Room {
  id: string;
  hostelId: string;
  blockId: string;
  floorNo: number;
  roomNo: string;
  type: RoomType;
  capacity: number;
  isAC: boolean;
  isAccessible: boolean;
  status: "active" | "maintenance" | "reserved";
}

export type BedStatus = "available" | "assigned" | "held" | "out_of_service" | "conflict";

export interface Bed {
  id: string;
  roomId: string;
  bedNo: string;
  roomNo: string;
  floor: number;
  block: string;
  type: RoomType;
  status: BedStatus;
  assignedStudentId?: string;
  assignedStudent?: {
    id: string;
    name: string;
    rollNo: string;
    score: number;
    preferenceRank: number;
    matchReason: string;
  };
  amenities: string[];
}

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "verified"
  | "ineligible"
  | "allocated"
  | "waitlisted"
  | "rejected"
  | "cancelled";

export interface Application {
  id: string;
  applicationNo: string;
  studentId: string;
  cycleId: string;
  status: ApplicationStatus;
  version: number;
  submittedAt?: string;
  priorityTier: "P0" | "P1" | "P2" | "P3" | "P4";
  formData: {
    fullName: string;
    rollNo: string;
    email: string;
    phone: string;
    homeAddress: string;
    distanceKm: number;
    programme: string;
    department: string;
    year: number;
    cgpa: number;
    category: string;
    hasDisability: boolean;
    preferredHostel?: string;
    preferredRoomType?: string;
    specialNotes?: string;
  };
}

export interface Preference {
  id: string;
  studentId: string;
  cycleId: string;
  rankedHostelIds: string[];
  preferredRoomTypes: RoomType[];
  floorPreference?: "ground" | "lower" | "upper" | "any";
  acPreference?: "required" | "preferred" | "neutral" | "no";
  updatedAt: string;
}

export type GroupMemberStatus = "pending" | "accepted" | "declined";

export interface GroupMember {
  studentId: string;
  name: string;
  rollNo: string;
  email: string;
  avatarUrl?: string;
  status: GroupMemberStatus;
  isLeader: boolean;
  compatibilityScore: number;
}

export interface Group {
  id: string;
  code: string;
  name: string;
  leaderId: string;
  members: GroupMember[];
  isLocked: boolean;
  targetRoomType: RoomType;
}

export type SleepSchedule = "early_bird" | "night_owl" | "flexible";
export type StudyHabit = "quiet_silent" | "background_music" | "group_study";
export type Cleanliness = "meticulous" | "moderate" | "relaxed";
export type NoiseTolerance = "low" | "moderate" | "high";
export type GuestPolicy = "strictly_no" | "weekends_only" | "flexible";
export type SmokingTolerance = "strictly_no" | "outside_only" | "tolerant";
export type DietPreference = "vegetarian" | "non_vegetarian" | "vegan" | "any";

export interface QuestionnaireAnswers {
  sleepSchedule: SleepSchedule;
  sleepScheduleImportance: number;
  studyHabit: StudyHabit;
  studyHabitImportance: number;
  cleanliness: Cleanliness;
  cleanlinessImportance: number;
  noiseTolerance: NoiseTolerance;
  noiseToleranceImportance: number;
  guestPolicy: GuestPolicy;
  guestPolicyImportance: number;
  smokingTolerance: SmokingTolerance;
  smokingToleranceImportance: number;
  dietPreference: DietPreference;
  dietPreferenceImportance: number;
  hasConsented: boolean;
  dealbreakers?: string[] | undefined;
}

export interface Compatibility {
  studentId1: string;
  studentId2: string;
  overallScore: number;
  dimensionScores: {
    sleepSchedule: number;
    studyHabit: number;
    cleanliness: number;
    noiseTolerance: number;
    guestPolicy: number;
  };
}

export type AllocationRunStatus = "idle" | "running" | "completed" | "failed" | "cancelled";

export interface AllocationRun {
  id: string;
  cycleId: string;
  name: string;
  status: AllocationRunStatus;
  seed: string;
  ruleVersion: string;
  weightVersion: string;
  startedAt: string;
  completedAt?: string;
  totalApplicants: number;
  assignedCount: number;
  waitlistedCount: number;
  rejectedCount: number;
  priorityInversions: number;
  firstChoiceRate: number;
  avgRankSatisfied: number;
  giniScore: number;
  liveLogs?: {
    timestamp: string;
    level: "info" | "warn" | "error";
    message: string;
  }[];
}

export interface Assignment {
  id: string;
  runId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  programme: string;
  hostelId: string;
  hostelName: string;
  roomId: string;
  roomNo: string;
  bedId: string;
  bedNo: string;
  preferenceRank: number;
  compatibilityScore: number;
  status: "draft" | "provisional" | "approved" | "published";
  explanation: string;
}

export interface Explanation {
  assignmentId: string;
  studentId: string;
  factors: {
    priorityTier: string;
    preferenceRank: number;
    compatibilityWithRoommates?: number;
    specialNeedsAddressed?: boolean;
    distanceWeightContribution: number;
  };
  summary: string;
}

export interface Waitlist {
  id: string;
  cycleId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  programme: string;
  position: number;
  quotaBucket: string;
  priorityScore: number;
  status: "waiting" | "offered" | "expired" | "promoted";
  offeredBedId?: string;
  deadline?: string;
}

export type AppealCategory =
  "distance_hardship" | "medical_overlooked" | "quota_discrepancy" | "severe_incompatibility";

export type AppealStatus = "submitted" | "under_review" | "approved" | "rejected";

export interface Appeal {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  allocationRef: string;
  appealCategory: AppealCategory;
  statement: string;
  evidenceDocs: string[];
  status: AppealStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewerNotes?: string;
}

export type RoomChangeReason =
  "academic_proximity" | "medical" | "roommate_conflict" | "special_need";

export type RoomChangeStatus = "submitted" | "under_review" | "approved" | "rejected" | "completed";

export interface RoomChangeTimelineItem {
  title: string;
  date: string;
  status: "completed" | "current" | "pending";
}

export interface RoomChange {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  currentHostel: string;
  currentRoom: string;
  targetHostel: string;
  targetRoomType: string;
  reasonCategory: RoomChangeReason;
  reasonText: string;
  status: RoomChangeStatus;
  submittedAt: string;
  slaDeadline: string;
  timeline: RoomChangeTimelineItem[];
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error" | "notice";
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

export interface AuditEntry {
  id: string;
  sequence: number;
  timestamp: string;
  actorId: string;
  actorRole: Role;
  actorIp: string;
  action: string;
  entityType: string;
  entityId: string;
  prevHash: string;
  entryHash: string;
  details?: Record<string, unknown>;
}

export interface WardenAssignment {
  id: string;
  studentName: string;
  rollNo: string;
  programme: string;
  hostelName: string;
  roomNo: string;
  bedNo: string;
  preferenceRank: number;
  compatibilityScore: number;
  status: string;
  explanation: string;
}

export interface WardenReviewCase {
  id: string;
  studentName: string;
  rollNo: string;
  assignedRoom: string;
  hostelName: string;
  compatibilityScore: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "changes_requested";
}

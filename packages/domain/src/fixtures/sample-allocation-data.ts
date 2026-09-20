import type { QuestionnaireAnswers } from "../compatibility/types.js";

export interface FixtureHostel {
  id: string;
  name: string;
  genderPolicy: "male" | "female" | "coed";
}

export interface FixtureRoom {
  id: string;
  hostelId: string;
  roomNumber: string;
  roomType: "single" | "double" | "triple";
  capacity: number;
  accessible: boolean;
}

export interface FixtureApplicant {
  id: string;
  name: string;
  gender: "male" | "female";
  programme: string;
  year: number;
  feeCategory: string;
  priorityTier: string;
  hasHold: boolean;
  accessibilityNeed: boolean;
  preferenceHostelIds: string[];
  groupId?: string;
  questionnaire: QuestionnaireAnswers;
}

export const SAMPLE_HOSTELS: FixtureHostel[] = [
  { id: "hostel-male-alpha", name: "Alpha Hostel (Male)", genderPolicy: "male" },
  { id: "hostel-female-beta", name: "Beta Hostel (Female)", genderPolicy: "female" },
];

export const SAMPLE_ROOMS: FixtureRoom[] = [
  { id: "room-101", hostelId: "hostel-male-alpha", roomNumber: "A-101", roomType: "single", capacity: 1, accessible: true },
  { id: "room-102", hostelId: "hostel-male-alpha", roomNumber: "A-102", roomType: "double", capacity: 2, accessible: false },
  { id: "room-103", hostelId: "hostel-male-alpha", roomNumber: "A-103", roomType: "triple", capacity: 3, accessible: false },
  { id: "room-201", hostelId: "hostel-female-beta", roomNumber: "B-201", roomType: "single", capacity: 1, accessible: false },
  { id: "room-202", hostelId: "hostel-female-beta", roomNumber: "B-202", roomType: "double", capacity: 2, accessible: true },
  { id: "room-203", hostelId: "hostel-female-beta", roomNumber: "B-203", roomType: "triple", capacity: 3, accessible: false },
];

export const SAMPLE_APPLICANTS: FixtureApplicant[] = [
  // Student 1 & 2: Exact tie in priority tier & criteria
  {
    id: "student-01",
    name: "Aarav Sharma",
    gender: "male",
    programme: "BTech",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_1_merit",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-male-alpha"],
    questionnaire: {
      sleep: { value: 3, importance: 2 },
      study: { value: 4, importance: 3 },
      smoking: { value: "non_smoker", importance: 3 },
    },
  },
  {
    id: "student-02",
    name: "Rohan Gupta",
    gender: "male",
    programme: "BTech",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_1_merit", // Exact tie with student-01
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-male-alpha"],
    questionnaire: {
      sleep: { value: 3, importance: 2 },
      study: { value: 4, importance: 3 },
      smoking: { value: "non_smoker", importance: 3 },
    },
  },

  // Student 3: Accessibility applicant requiring accessible room
  {
    id: "student-03",
    name: "Karan Patel",
    gender: "male",
    programme: "MTech",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_1_accessibility",
    hasHold: false,
    accessibilityNeed: true,
    preferenceHostelIds: ["hostel-male-alpha"],
    questionnaire: { sleep: { value: 2, importance: 1 } },
  },

  // Student 4 & 5: Mutual Deal-Breaker Pair
  {
    id: "student-04-smoker",
    name: "Vikram Malhotra",
    gender: "male",
    programme: "BTech",
    year: 2,
    feeCategory: "General",
    priorityTier: "tier_2_regular",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-male-alpha"],
    groupId: "group-dealbreaker",
    questionnaire: {
      smoking: { value: "smoker", importance: 3, dealBreaker: true },
    },
  },
  {
    id: "student-05-non-smoker",
    name: "Aditya Roy",
    gender: "male",
    programme: "BTech",
    year: 2,
    feeCategory: "General",
    priorityTier: "tier_2_regular",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-male-alpha"],
    groupId: "group-dealbreaker",
    questionnaire: {
      smoking: { value: "non_smoker", importance: 3, dealBreaker: true },
    },
  },

  // Student 6-10: Oversized Group (5 students requesting a room together, larger than any room max capacity 3)
  {
    id: "student-06-grp",
    name: "Priya Singh",
    gender: "female",
    programme: "MBA",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_2_regular",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-female-beta"],
    groupId: "group-oversized-5",
    questionnaire: { sleep: { value: 4, importance: 2 } },
  },
  {
    id: "student-07-grp",
    name: "Ananya Iyer",
    gender: "female",
    programme: "MBA",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_2_regular",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-female-beta"],
    groupId: "group-oversized-5",
    questionnaire: { sleep: { value: 4, importance: 2 } },
  },
  {
    id: "student-08-grp",
    name: "Sanya Kapoor",
    gender: "female",
    programme: "MBA",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_2_regular",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-female-beta"],
    groupId: "group-oversized-5",
    questionnaire: { sleep: { value: 4, importance: 2 } },
  },
  {
    id: "student-09-grp",
    name: "Meera Reddy",
    gender: "female",
    programme: "MBA",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_2_regular",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-female-beta"],
    groupId: "group-oversized-5",
    questionnaire: { sleep: { value: 4, importance: 2 } },
  },
  {
    id: "student-10-grp",
    name: "Divya Nair",
    gender: "female",
    programme: "MBA",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_2_regular",
    hasHold: false,
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-female-beta"],
    groupId: "group-oversized-5",
    questionnaire: { sleep: { value: 4, importance: 2 } },
  },

  // Student 11: Applicant with a Hold (Ineligible / Blocked)
  {
    id: "student-11-hold",
    name: "Rahul Saxena",
    gender: "male",
    programme: "BTech",
    year: 3,
    feeCategory: "General",
    priorityTier: "tier_2_regular",
    hasHold: true, // Hold flag active
    accessibilityNeed: false,
    preferenceHostelIds: ["hostel-male-alpha"],
    questionnaire: { sleep: { value: 1, importance: 1 } },
  },

  // Student 12: Unmet accessibility applicant (no accessible beds left or available)
  {
    id: "student-12-unmet-access",
    name: "Kavya Menon",
    gender: "female",
    programme: "PhD",
    year: 1,
    feeCategory: "General",
    priorityTier: "tier_1_accessibility",
    hasHold: false,
    accessibilityNeed: true,
    preferenceHostelIds: ["hostel-female-beta"],
    questionnaire: { sleep: { value: 5, importance: 3 } },
  },
];

export const SAMPLE_EDGE_CASES = {
  exactTies: ["student-01", "student-02"],
  oversizedGroup: {
    groupId: "group-oversized-5",
    memberIds: ["student-06-grp", "student-07-grp", "student-08-grp", "student-09-grp", "student-10-grp"],
    maxRoomCapacity: 3,
  },
  dealBreakerConflictPair: ["student-04-smoker", "student-05-non-smoker"],
  applicantWithHold: "student-11-hold",
  unmetAccessibilityApplicant: "student-12-unmet-access",
};

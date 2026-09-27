/**
 * Synthetic Realistic University Dataset for HostelHub
 * Covers all university roles: Student, Warden, Chief Warden, Hostel Admin, Dean, Sys Admin
 */

export interface MockHostel {
  id: string;
  name: string;
  code: string;
  campus: string;
  gender: "male" | "female" | "coed";
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  blocksCount: number;
  floorsCount: number;
  distanceToCampusMeters: number;
  walkingTimeMins: number;
  isAccessible: boolean;
  hasAC: boolean;
  amenities: string[];
  imageUrl: string;
}

export interface MockBed {
  id: string;
  hostelId: string;
  hostelName: string;
  blockId: string;
  blockName: string;
  floorNo: number;
  roomId: string;
  roomNo: string;
  bedNo: string;
  roomType: "single" | "double" | "triple" | "quad";
  status: "available" | "held" | "assigned" | "out_of_service" | "selected" | "conflict";
  isAccessible: boolean;
  hasAC: boolean;
  assignedStudentId?: string | undefined;
  assignedStudentName?: string | undefined;
  assignedStudentRoll?: string | undefined;
  assignedStudentGender?: string | undefined;
  compatibilityScore?: number | undefined;
  assignedPreferenceRank?: number | undefined;
  outOfServiceReason?: string | undefined;
}

export interface MockStudent {
  id: string;
  rollNo: string;
  name: string;
  email: string;
  programme: string;
  department: string;
  year: number;
  gender: "male" | "female" | "other";
  cgpa: number;
  distanceKm: number;
  disabilityCategory?: string | undefined;
  quotaCategory: string;
  avatarUrl: string;
  phone: string;
  homeState: string;
  hasPaidFees: boolean;
}

export interface MockApplication {
  id: string;
  studentId: string;
  student: MockStudent;
  cycleId: string;
  cycleName: string;
  status:
    "draft" | "submitted" | "under_review" | "eligible" | "ineligible" | "allocated" | "waitlisted";
  submittedAt?: string | undefined;
  updatedAt: string;
  eligibilityStatus: "passed" | "failed" | "pending";
  eligibilityNotes?: string | undefined;
  hostelPreferences: string[]; // hostel IDs in ranked order
  roomTypePreferences: ("single" | "double" | "triple" | "quad")[];
  specialRequests?: string | undefined;
  hasUploadedDocs: boolean;
  uploadedDocuments: {
    id: string;
    type: string;
    name: string;
    status: "verified" | "pending" | "rejected";
    uploadedAt: string;
  }[];
}

export interface MockQuestionnaireAnswer {
  sleepSchedule: "early_bird" | "night_owl" | "flexible";
  sleepScheduleImportance: number; // 1-5
  studyHabit: "quiet_silent" | "background_music" | "group_study";
  studyHabitImportance: number;
  cleanliness: "meticulous" | "moderate" | "relaxed";
  cleanlinessImportance: number;
  noiseTolerance: "low" | "moderate" | "high";
  noiseToleranceImportance: number;
  guestPolicy: "strictly_no" | "weekends_only" | "flexible";
  guestPolicyImportance: number;
  smokingTolerance: "strictly_no" | "outside_only" | "tolerant";
  smokingToleranceImportance: number;
  dietPreference: "vegetarian" | "non_vegetarian" | "vegan" | "any";
  dietPreferenceImportance: number;
  dealbreakers?: string[] | undefined;
  hasConsented?: boolean | undefined;
}

export interface MockGroup {
  id: string;
  code: string;
  name: string;
  leaderId: string;
  members: {
    studentId: string;
    name: string;
    rollNo: string;
    email: string;
    avatarUrl: string;
    status: "accepted" | "pending" | "declined";
    isLeader: boolean;
    compatibilityScore?: number | undefined;
  }[];
  isLocked: boolean;
  targetRoomType: "double" | "triple" | "quad";
}

export interface MockAllocationResult {
  applicationId: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  avatarUrl: string;
  gender: string;
  hostelId: string;
  hostelName: string;
  blockName: string;
  floorNo: number;
  roomNo: string;
  bedNo: string;
  roomType: "single" | "double" | "triple" | "quad";
  preferenceRank: number;
  compatibilityScore: number;
  roommates: {
    name: string;
    rollNo: string;
    programme: string;
    avatarUrl: string;
    compatibilityScore: number;
  }[];
  explanation: {
    hardConstraintsChecked: string[];
    preferenceScore: number;
    compatibilityScore: number;
    fillScore: number;
    distanceScore: number;
    continuityScore: number;
    totalScore: number;
    tieBreakInfo: string;
    humanSummary: string;
  };
  allocatedAt: string;
  verificationToken: string;
  hasDownloadedLetter: boolean;
}

export interface MockAllocationRun {
  id: string;
  cycleId: string;
  cycleName: string;
  seed: number;
  weightVersion: string;
  rulesVersion: string;
  status: "running" | "completed" | "failed" | "cancelled";
  isDryRun: boolean;
  progressPercent: number;
  currentStage:
    | "Snapshot"
    | "Eligibility"
    | "Ranking"
    | "Assignment"
    | "Improvement"
    | "Validation"
    | "Draft persistence"
    | "Completed";
  totalApplicants: number;
  processedApplicants: number;
  assignedCount: number;
  waitlistedCount: number;
  failedCount: number;
  runtimeMs: number;
  metrics: {
    firstChoiceRate: number; // e.g. 78.4%
    averageRank: number; // e.g. 1.34
    giniPreferenceScore: number; // e.g. 0.12
    meanCompatibility: number; // e.g. 84.6%
    minCompatibility: number; // e.g. 68.0%
    priorityInversions: number; // 0
  };
  liveLogs: { timestamp: string; level: "info" | "warn" | "error"; message: string }[];
  startedAt: string;
  completedAt?: string | undefined;
  draftId?: string | undefined;
}

export interface MockWaitlistEntry {
  id: string;
  cycleId: string;
  position: number;
  studentId: string;
  studentName: string;
  rollNo: string;
  quotaBucket: string;
  tierScore: number;
  preferredHostelNames: string[];
  eligibleHostelIds: string[];
  status: "waiting" | "promoted" | "declined" | "expired";
  promotedAt?: string | undefined;
  promotionReason?: string | undefined;
  promotedBy?: string | undefined;
}

export interface MockRoomChange {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  currentHostel: string;
  currentRoom: string;
  targetHostel: string;
  targetRoomType: string;
  reasonCategory: "medical" | "roommate_conflict" | "academic_proximity" | "special_need";
  reasonText: string;
  status: "submitted" | "under_review" | "approved" | "rejected";
  submittedAt: string;
  slaDeadline: string;
  wardenNotes?: string | undefined;
  timeline: { title: string; date: string; status: "completed" | "current" | "pending" }[];
}

export interface MockAppeal {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  allocationRef: string;
  appealCategory:
    "medical_overlooked" | "quota_discrepancy" | "severe_incompatibility" | "distance_hardship";
  statement: string;
  evidenceDocs: string[];
  status: "submitted" | "under_review" | "upheld" | "dismissed";
  submittedAt: string;
  slaDeadline: string;
  wardenResponse?: string | undefined;
  reviewedBy?: string | undefined;
}

export interface MockAuditEntry {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  beforeState?: string | undefined;
  afterState?: string | undefined;
  timestamp: string;
  ipAddress: string;
  hash: string;
  prevHash: string;
  isValidChain: boolean;
}

export interface MockWeightSetting {
  id: string;
  version: string;
  wP: number; // Preference weight
  wC: number; // Compatibility weight
  wF: number; // Room fill weight
  wD: number; // Distance weight
  wK: number; // Continuity weight
  changedBy: string;
  reason: string;
  createdAt: string;
}

// ── Synthetic Dataset ──────────────────────────────────────────────────────────

export const MOCK_HOSTELS: MockHostel[] = [
  {
    id: "hostel-a",
    name: "Aryabhata Hall",
    code: "BH-1",
    campus: "North Campus",
    gender: "male",
    totalBeds: 420,
    occupiedBeds: 395,
    availableBeds: 25,
    blocksCount: 3,
    floorsCount: 4,
    distanceToCampusMeters: 250,
    walkingTimeMins: 3,
    isAccessible: true,
    hasAC: true,
    amenities: [
      "24/7 Silent Study Pods",
      "Gigabit WiFi",
      "Gym & Fitness Center",
      "Elevator",
      "Solar Water",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "hostel-b",
    name: "Gargi Residence",
    code: "GH-1",
    campus: "East Campus",
    gender: "female",
    totalBeds: 380,
    occupiedBeds: 358,
    availableBeds: 22,
    blocksCount: 2,
    floorsCount: 5,
    distanceToCampusMeters: 400,
    walkingTimeMins: 5,
    isAccessible: true,
    hasAC: true,
    amenities: [
      "Courtyard Garden",
      "Yoga & Aerobics Studio",
      "Biometric Turnstiles",
      "Music Room",
      "Laundry",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "hostel-c",
    name: "Ramanujan Tower",
    code: "PG-1",
    campus: "Research Enclave",
    gender: "coed",
    totalBeds: 400,
    occupiedBeds: 360,
    availableBeds: 40,
    blocksCount: 4,
    floorsCount: 6,
    distanceToCampusMeters: 600,
    walkingTimeMins: 8,
    isAccessible: true,
    hasAC: true,
    amenities: [
      "Conference Pods",
      "Floor Pantries",
      "Solar Heating",
      "High-Speed Computing Lab",
      "Cafeteria",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "hostel-d",
    name: "Kalpana Chawla Hall",
    code: "GH-2",
    campus: "South Campus",
    gender: "female",
    totalBeds: 320,
    occupiedBeds: 285,
    availableBeds: 35,
    blocksCount: 2,
    floorsCount: 4,
    distanceToCampusMeters: 350,
    walkingTimeMins: 4,
    isAccessible: false,
    hasAC: false,
    amenities: [
      "Activity Hall",
      "Peer Tutoring Lounge",
      "Table Tennis Arena",
      "Reading Room",
      "Shuttle Stop",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "hostel-e",
    name: "Vikram Sarabhai Hall",
    code: "BH-2",
    campus: "West Campus",
    gender: "male",
    totalBeds: 450,
    occupiedBeds: 410,
    availableBeds: 40,
    blocksCount: 3,
    floorsCount: 5,
    distanceToCampusMeters: 500,
    walkingTimeMins: 6,
    isAccessible: true,
    hasAC: false,
    amenities: [
      "Basketball Court",
      "Open Amphitheatre",
      "Night Canteen",
      "Badminton Court",
      "EV Charging",
    ],
    imageUrl:
      "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  },
];

export const MOCK_STUDENTS: MockStudent[] = [
  {
    id: "std-101",
    rollNo: "23CS10042",
    name: "Aarav Sharma",
    email: "aarav.sharma@campus.edu",
    programme: "B.Tech Computer Science & Engineering",
    department: "Computer Science",
    year: 3,
    gender: "male",
    cgpa: 9.35,
    distanceKm: 850,
    quotaCategory: "General Merited",
    avatarUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
    phone: "+91 98765 43210",
    homeState: "Maharashtra",
    hasPaidFees: true,
  },
  {
    id: "std-102",
    rollNo: "23CS10088",
    name: "Rohan Deshmukh",
    email: "rohan.deshmukh@campus.edu",
    programme: "B.Tech Computer Science & Engineering",
    department: "Computer Science",
    year: 3,
    gender: "male",
    cgpa: 8.92,
    distanceKm: 620,
    quotaCategory: "General Merited",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
    phone: "+91 98765 43211",
    homeState: "Gujarat",
    hasPaidFees: true,
  },
  {
    id: "std-103",
    rollNo: "24EE20015",
    name: "Ananya Verma",
    email: "ananya.verma@campus.edu",
    programme: "B.Tech Electrical Engineering",
    department: "Electrical Engineering",
    year: 2,
    gender: "female",
    cgpa: 9.12,
    distanceKm: 1200,
    quotaCategory: "General Merited",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80",
    phone: "+91 98765 43212",
    homeState: "Delhi NCR",
    hasPaidFees: true,
  },
  {
    id: "std-104",
    rollNo: "24ME10023",
    name: "Kabir Mehta",
    email: "kabir.mehta@campus.edu",
    programme: "B.Tech Mechanical Engineering",
    department: "Mechanical Engineering",
    year: 2,
    gender: "male",
    cgpa: 8.45,
    distanceKm: 450,
    quotaCategory: "Sports Quota",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80",
    phone: "+91 98765 43213",
    homeState: "Punjab",
    hasPaidFees: true,
  },
  {
    id: "std-105",
    rollNo: "25PHD001",
    name: "Dr. Priya Sundaram",
    email: "priya.s@campus.edu",
    programme: "Ph.D. Quantum Computing",
    department: "Physics",
    year: 1,
    gender: "female",
    cgpa: 9.8,
    distanceKm: 2100,
    disabilityCategory: "Locomotor (Accessible Ground Floor Required)",
    quotaCategory: "PwD Accessible",
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80",
    phone: "+91 98765 43214",
    homeState: "Tamil Nadu",
    hasPaidFees: true,
  },
];

export const MOCK_QUESTIONNAIRE: MockQuestionnaireAnswer = {
  sleepSchedule: "night_owl",
  sleepScheduleImportance: 4,
  studyHabit: "quiet_silent",
  studyHabitImportance: 5,
  cleanliness: "meticulous",
  cleanlinessImportance: 4,
  noiseTolerance: "moderate",
  noiseToleranceImportance: 3,
  guestPolicy: "weekends_only",
  guestPolicyImportance: 3,
  smokingTolerance: "strictly_no",
  smokingToleranceImportance: 5,
  dietPreference: "vegetarian",
  dietPreferenceImportance: 2,
  dealbreakers: ["smoking_in_room", "loud_music_after_midnight"],
};

export const MOCK_ACTIVE_ALLOCATION: MockAllocationResult = {
  applicationId: "app-2026-0042",
  studentId: "std-101",
  studentName: "Aarav Sharma",
  rollNo: "23CS10042",
  avatarUrl:
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
  gender: "male",
  hostelId: "hostel-a",
  hostelName: "Aryabhata Hall",
  blockName: "Block A (Sanskritik)",
  floorNo: 2,
  roomNo: "A-204",
  bedNo: "Bed 1 (Window Side)",
  roomType: "double",
  preferenceRank: 1,
  compatibilityScore: 92,
  roommates: [
    {
      name: "Rohan Deshmukh",
      rollNo: "23CS10088",
      programme: "B.Tech Computer Science (Year 3)",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
      compatibilityScore: 92,
    },
  ],
  explanation: {
    hardConstraintsChecked: [
      "HC1: Gender cohort match (Male → Block A)",
      "HC2: Single occupancy invariant satisfied (0 overlap)",
      "HC3: Accessible bed assigned only where medical certificate valid",
      "HC4: Year 3 UG eligibility window respected",
      "HC5: Dealbreaker constraints passed (non-smoking, silent study)",
    ],
    preferenceScore: 95.0,
    compatibilityScore: 92.0,
    fillScore: 100.0,
    distanceScore: 88.0,
    continuityScore: 100.0,
    totalScore: 93.85,
    tieBreakInfo: "Deterministic PCG32 PRNG seed 421098. No manual override required.",
    humanSummary:
      "You received your 1st preference (Aryabhata Hall, Double AC) because your priority score met the general merited cutoff and your lifestyle compatibility with Rohan Deshmukh scored 92%.",
  },
  allocatedAt: "2026-09-24T14:30:00Z",
  verificationToken: "HH-2026-ALLOC-99281-A204",
  hasDownloadedLetter: false,
};

export const MOCK_ALLOCATION_RUNS: MockAllocationRun[] = [
  {
    id: "run-fall-2026-prod",
    cycleId: "cycle-fall-2026",
    cycleName: "Fall 2026 Regular Allocation",
    seed: 421098,
    weightVersion: "v2.4.0 (Policy 2026-R)",
    rulesVersion: "rules-v3-aug2026",
    status: "completed",
    isDryRun: false,
    progressPercent: 100,
    currentStage: "Completed",
    totalApplicants: 1970,
    processedApplicants: 1970,
    assignedCount: 1850,
    waitlistedCount: 120,
    failedCount: 0,
    runtimeMs: 14280,
    metrics: {
      firstChoiceRate: 81.2,
      averageRank: 1.28,
      giniPreferenceScore: 0.08,
      meanCompatibility: 87.4,
      minCompatibility: 71.0,
      priorityInversions: 0,
    },
    liveLogs: [
      {
        timestamp: "14:20:00",
        level: "info",
        message:
          "Initialized deterministic snapshot for cycle Fall 2026. Input hash computed: 8f9b...a12c",
      },
      {
        timestamp: "14:20:02",
        level: "info",
        message:
          "Evaluated eligibility for 1,970 applicants across 5 policy tiers. 1,970 eligible.",
      },
      {
        timestamp: "14:20:05",
        level: "info",
        message:
          "Normalized 284 roommate groups. Sorted priority tiers with PCG32 deterministic tiebreaking.",
      },
      {
        timestamp: "14:20:08",
        level: "info",
        message:
          "Indexed 1,970 feasible beds across 5 towers. Starting Gale-Shapley weighted scoring loop.",
      },
      {
        timestamp: "14:20:11",
        level: "info",
        message:
          "Bounded local search completed 42 adjacent swaps (global satisfaction improved by +3.4%).",
      },
      {
        timestamp: "14:20:13",
        level: "info",
        message:
          "Invariant validator verified P1-P7: 0 double assignments, 0 capacity overflows, 0 priority inversions.",
      },
      {
        timestamp: "14:20:14",
        level: "info",
        message: "Draft persisted atomically as draft-fall-2026-v1. Ready for Warden Sign-off.",
      },
    ],
    startedAt: "2026-09-24T14:20:00Z",
    completedAt: "2026-09-24T14:20:14Z",
    draftId: "draft-fall-2026-v1",
  },
];

export const MOCK_WAITLIST: MockWaitlistEntry[] = [
  {
    id: "wl-01",
    cycleId: "cycle-fall-2026",
    position: 1,
    studentId: "std-201",
    studentName: "Devansh Singhania",
    rollNo: "24CS10099",
    quotaBucket: "General Merited",
    tierScore: 88.5,
    preferredHostelNames: ["Aryabhata Hall", "Vikram Sarabhai Hall"],
    eligibleHostelIds: ["hostel-a", "hostel-e"],
    status: "waiting",
  },
  {
    id: "wl-02",
    cycleId: "cycle-fall-2026",
    position: 2,
    studentId: "std-202",
    studentName: "Kavya Pillai",
    rollNo: "24EC20045",
    quotaBucket: "General Merited",
    tierScore: 87.2,
    preferredHostelNames: ["Gargi Residence", "Kalpana Chawla Hall"],
    eligibleHostelIds: ["hostel-b", "hostel-d"],
    status: "waiting",
  },
  {
    id: "wl-03",
    cycleId: "cycle-fall-2026",
    position: 3,
    studentId: "std-203",
    studentName: "Sameer Qureshi",
    rollNo: "24ME10080",
    quotaBucket: "State Quota (Dist > 1000km)",
    tierScore: 86.4,
    preferredHostelNames: ["Aryabhata Hall"],
    eligibleHostelIds: ["hostel-a", "hostel-e"],
    status: "waiting",
  },
];

export const MOCK_AUDIT_LOGS: MockAuditEntry[] = [
  {
    id: "aud-901",
    actor: "Prof. S. R. Kulkarni",
    actorRole: "Warden (Aryabhata Hall)",
    action: "WARDEN_OVERRIDE_APPLIED",
    target: "Assignment #402 (Room A-204 Bed 2)",
    beforeState: "Assigned: Siddharth Rao (std-109)",
    afterState: "Assigned: Rohan Deshmukh (std-102)",
    timestamp: "2026-09-25T11:24:10Z",
    ipAddress: "10.20.4.15",
    hash: "a94f8e71b29a8f5043c87e145903bce3429810a9fbc61028345719bc4a890123",
    prevHash: "739281a0e19483c9d784710bc489201948571930bc4891048571920394857192",
    isValidChain: true,
  },
  {
    id: "aud-902",
    actor: "Dr. Meenakshi Sundaram",
    actorRole: "Chief Warden",
    action: "DRAFT_APPROVED_FOR_PUBLICATION",
    target: "Allocation Draft #draft-fall-2026-v1",
    beforeState: "Status: SUBMITTED_FOR_REVIEW",
    afterState: "Status: APPROVED",
    timestamp: "2026-09-25T16:45:00Z",
    ipAddress: "10.20.1.2",
    hash: "5910283475910293847591029384759102938475910293847591029384759102",
    prevHash: "a94f8e71b29a8f5043c87e145903bce3429810a9fbc61028345719bc4a890123",
    isValidChain: true,
  },
  {
    id: "aud-903",
    actor: "System Automation",
    actorRole: "System Daemon",
    action: "HMAC_AUDIT_CHAIN_VERIFIED",
    target: "Global Ledger (2,840 records)",
    beforeState: "Integrity Check: Running",
    afterState: "Integrity Check: 100% Passed (0 Tampering)",
    timestamp: "2026-09-26T00:00:00Z",
    ipAddress: "127.0.0.1",
    hash: "8839201948571920394857192039485719203948571920394857192039485719",
    prevHash: "5910283475910293847591029384759102938475910293847591029384759102",
    isValidChain: true,
  },
];

export const MOCK_WEIGHT_VERSIONS: MockWeightSetting[] = [
  {
    id: "wt-01",
    version: "v2.4.0 (Active)",
    wP: 0.45,
    wC: 0.3,
    wF: 0.1,
    wD: 0.1,
    wK: 0.05,
    changedBy: "Senate Housing Sub-Committee",
    reason: "Increased preference weight to 0.45 per Academic Council resolution 2026-A.",
    createdAt: "2026-08-15T10:00:00Z",
  },
  {
    id: "wt-02",
    version: "v2.3.1 (Archived)",
    wP: 0.4,
    wC: 0.35,
    wF: 0.1,
    wD: 0.1,
    wK: 0.05,
    changedBy: "Dean Student Welfare",
    reason: "Pilot adjustment for higher roommate lifestyle compatibility.",
    createdAt: "2026-01-10T12:00:00Z",
  },
];

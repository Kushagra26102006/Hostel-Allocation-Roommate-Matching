/**
 * Mock API Service Layer for HostelHub
 * Allows frontend to operate fully offline or in demo mode without hardcoded UI state.
 */

import {
  MOCK_HOSTELS,
  MOCK_QUESTIONNAIRE,
  MOCK_ACTIVE_ALLOCATION,
  MOCK_ALLOCATION_RUNS,
  MOCK_WAITLIST,
  MOCK_AUDIT_LOGS,
  MOCK_WEIGHT_VERSIONS,
  type MockHostel,
  type MockBed,
  type MockGroup,
  type MockAllocationResult,
  type MockAllocationRun,
  type MockWaitlistEntry,
  type MockRoomChange,
  type MockAppeal,
  type MockAuditEntry,
  type MockWeightSetting,
  type MockQuestionnaireAnswer,
} from "./data";

// Helper to simulate realistic network delay
const delay = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

// In-memory state for mutations
let currentQuestionnaire = { ...MOCK_QUESTIONNAIRE };
let currentGroup: MockGroup = {
  id: "grp-2026-88",
  code: "CAMPUS-8819",
  name: "Aarav & Rohan Roommate Pair",
  leaderId: "std-101",
  members: [
    {
      studentId: "std-101",
      name: "Aarav Sharma",
      rollNo: "23CS10042",
      email: "aarav.sharma@campus.edu",
      avatarUrl:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80",
      status: "accepted",
      isLeader: true,
      compatibilityScore: 92,
    },
    {
      studentId: "std-102",
      name: "Rohan Deshmukh",
      rollNo: "23CS10088",
      email: "rohan.deshmukh@campus.edu",
      avatarUrl:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80",
      status: "accepted",
      isLeader: false,
      compatibilityScore: 92,
    },
  ],
  isLocked: false,
  targetRoomType: "double",
};

let currentAppPreferences: string[] = ["hostel-a", "hostel-e", "hostel-c"];

let currentRoomChanges: MockRoomChange[] = [
  {
    id: "rc-101",
    studentId: "std-101",
    studentName: "Aarav Sharma",
    rollNo: "23CS10042",
    currentHostel: "Aryabhata Hall (Room A-204)",
    currentRoom: "A-204",
    targetHostel: "Ramanujan Tower (Single Suite)",
    targetRoomType: "Single AC",
    reasonCategory: "academic_proximity",
    reasonText:
      "Appointed as Lab Teaching Assistant in Computing Block; requires late-night research access.",
    status: "under_review",
    submittedAt: "2026-09-25T10:00:00Z",
    slaDeadline: "2026-09-28T18:00:00Z",
    timeline: [
      { title: "Request Submitted", date: "25 Sep 2026, 10:00 AM", status: "completed" },
      { title: "Warden Document Check", date: "26 Sep 2026, 02:30 PM", status: "completed" },
      { title: "Chief Warden Sign-Off", date: "Pending SLA", status: "current" },
      { title: "Key Reassignment & Check-In", date: "Scheduled", status: "pending" },
    ],
  },
];

let currentAppeals: MockAppeal[] = [
  {
    id: "apl-501",
    studentId: "std-104",
    studentName: "Kabir Mehta",
    rollNo: "24ME10023",
    allocationRef: "HH-2026-ALLOC-88412",
    appealCategory: "distance_hardship",
    statement:
      "Assigned to Block D triple sharing instead of single room. I have inter-university sports training schedule requiring early morning curfew exemptions.",
    evidenceDocs: ["sports_council_letter.pdf", "coach_endorsement.pdf"],
    status: "under_review",
    submittedAt: "2026-09-25T14:20:00Z",
    slaDeadline: "2026-09-27T18:00:00Z",
  },
];

let currentFeatureFlags = [
  {
    key: "ALLOW_ROOMMATE_GROUPING",
    name: "Student Group Formation",
    enabled: true,
    category: "Applications",
  },
  {
    key: "ENABLE_GALE_SHAPLEY_LOCAL_SEARCH",
    name: "Bounded 2-Opt Local Search Improvement",
    enabled: true,
    category: "Algorithm",
  },
  {
    key: "INSTANT_QR_VERIFICATION",
    name: "Public QR Allotment Verification",
    enabled: true,
    category: "Security",
  },
  {
    key: "STRICT_ACCESSIBILITY_FIRST",
    name: "PwD Priority Floor Enforcement",
    enabled: true,
    category: "Policy",
  },
  {
    key: "REALTIME_SSE_STREAMING",
    name: "Live SSE Allocation Progress Streaming",
    enabled: true,
    category: "Realtime",
  },
];

let currentApiKeys = [
  {
    id: "key-1",
    name: "Campus Mobile App Integration",
    prefix: "hh_live_89a...",
    scopes: ["read:allotments", "read:hostels"],
    createdAt: "2026-08-01",
    lastUsed: "2 mins ago",
  },
  {
    id: "key-2",
    name: "ERP Student Information Sync",
    prefix: "hh_live_33b...",
    scopes: ["read:students", "write:fees"],
    createdAt: "2026-08-15",
    lastUsed: "1 hour ago",
  },
];

let currentWebhooks = [
  {
    id: "wh-1",
    url: "https://erp.campus.edu/webhooks/hostel-allotment",
    event: "allocation.published",
    status: "active",
    successRate: "99.8%",
  },
  {
    id: "wh-2",
    url: "https://security.campus.edu/events/turnstile-sync",
    event: "draft.approved",
    status: "active",
    successRate: "100%",
  },
];

export const mockApi = {
  // ── Hostels & Inventory ──────────────────────────────────────────────────
  getHostels: async (): Promise<MockHostel[]> => {
    await delay();
    return MOCK_HOSTELS;
  },

  getHostelById: async (id: string): Promise<MockHostel | undefined> => {
    await delay();
    return MOCK_HOSTELS.find((h) => h.id === id);
  },

  getFloorBeds: async (hostelId: string, floorNo = 1): Promise<MockBed[]> => {
    await delay();
    const hostel = MOCK_HOSTELS.find((h) => h.id === hostelId) ?? MOCK_HOSTELS[0]!;
    const beds: MockBed[] = [];

    for (let r = 1; r <= 8; r++) {
      const roomNo = `${hostel.code[0]}-${floorNo}0${r}`;
      const statuses: MockBed["status"][] = [
        "assigned",
        "assigned",
        "available",
        "held",
        "out_of_service",
      ];
      const st1 = statuses[r % statuses.length] ?? "available";
      const st2 = statuses[(r + 1) % statuses.length] ?? "available";

      beds.push(
        {
          id: `bed-${hostel.id}-f${floorNo}-r${r}-1`,
          hostelId: hostel.id,
          hostelName: hostel.name,
          blockId: "block-a",
          blockName: "Block A",
          floorNo,
          roomId: `room-${r}`,
          roomNo,
          bedNo: "Bed 1",
          roomType: "double",
          status: st1,
          isAccessible: floorNo === 1,
          hasAC: hostel.hasAC,
          assignedStudentName: r % 2 === 0 ? "Aarav Sharma" : "Rohan Deshmukh",
          assignedStudentRoll: r % 2 === 0 ? "23CS10042" : "23CS10088",
          compatibilityScore: 92,
          assignedPreferenceRank: 1,
        },
        {
          id: `bed-${hostel.id}-f${floorNo}-r${r}-2`,
          hostelId: hostel.id,
          hostelName: hostel.name,
          blockId: "block-a",
          blockName: "Block A",
          floorNo,
          roomId: `room-${r}`,
          roomNo,
          bedNo: "Bed 2",
          roomType: "double",
          status: st2,
          isAccessible: floorNo === 1,
          hasAC: hostel.hasAC,
          assignedStudentName: r % 3 === 0 ? "Kabir Mehta" : undefined,
          assignedStudentRoll: r % 3 === 0 ? "24ME10023" : undefined,
          compatibilityScore: 88,
          assignedPreferenceRank: 2,
        },
      );
    }
    return beds;
  },

  // ── Student Application ──────────────────────────────────────────────────
  getPreferences: async (): Promise<string[]> => {
    await delay();
    return currentAppPreferences;
  },

  updatePreferences: async (preferences: string[]): Promise<{ success: boolean }> => {
    await delay();
    currentAppPreferences = preferences;
    return { success: true };
  },

  getQuestionnaire: async (): Promise<MockQuestionnaireAnswer> => {
    await delay();
    return currentQuestionnaire;
  },

  saveQuestionnaire: async (
    answers: Partial<MockQuestionnaireAnswer>,
  ): Promise<{ success: boolean }> => {
    await delay();
    currentQuestionnaire = { ...currentQuestionnaire, ...answers };
    return { success: true };
  },

  getGroup: async (): Promise<MockGroup> => {
    await delay();
    return currentGroup;
  },

  inviteGroupMember: async (rollNo: string): Promise<MockGroup> => {
    await delay(200);
    currentGroup.members.push({
      studentId: `std-${Date.now()}`,
      name: `Student (${rollNo})`,
      rollNo,
      email: `${rollNo.toLowerCase()}@campus.edu`,
      avatarUrl:
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80",
      status: "pending",
      isLeader: false,
      compatibilityScore: 86,
    });
    return currentGroup;
  },

  getAllocationResult: async (): Promise<MockAllocationResult> => {
    await delay();
    return MOCK_ACTIVE_ALLOCATION;
  },

  // ── Room Changes & Appeals ───────────────────────────────────────────────
  getRoomChanges: async (): Promise<MockRoomChange[]> => {
    await delay();
    return currentRoomChanges;
  },

  createRoomChange: async (req: Partial<MockRoomChange>): Promise<MockRoomChange> => {
    await delay(300);
    const newChange: MockRoomChange = {
      id: `rc-${Date.now()}`,
      studentId: "std-101",
      studentName: "Aarav Sharma",
      rollNo: "23CS10042",
      currentHostel: "Aryabhata Hall",
      currentRoom: "A-204",
      targetHostel: req.targetHostel || "Ramanujan Tower",
      targetRoomType: req.targetRoomType || "Single AC",
      reasonCategory: req.reasonCategory || "academic_proximity",
      reasonText: req.reasonText || "Research laboratory proximity request",
      status: "submitted",
      submittedAt: new Date().toISOString(),
      slaDeadline: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
      timeline: [
        { title: "Request Submitted", date: "Just now", status: "completed" },
        { title: "Warden Assessment", date: "In Queue", status: "current" },
        { title: "Chief Warden Approval", date: "Pending", status: "pending" },
      ],
    };
    currentRoomChanges.unshift(newChange);
    return newChange;
  },

  getAppeals: async (): Promise<MockAppeal[]> => {
    await delay();
    return currentAppeals;
  },

  createAppeal: async (req: Partial<MockAppeal>): Promise<MockAppeal> => {
    await delay(300);
    const newAppeal: MockAppeal = {
      id: `apl-${Date.now()}`,
      studentId: "std-101",
      studentName: "Aarav Sharma",
      rollNo: "23CS10042",
      allocationRef: "HH-2026-ALLOC-99281",
      appealCategory: req.appealCategory || "medical_overlooked",
      statement: req.statement || "",
      evidenceDocs: req.evidenceDocs || ["medical_certificate.pdf"],
      status: "submitted",
      submittedAt: new Date().toISOString(),
      slaDeadline: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
    };
    currentAppeals.unshift(newAppeal);
    return newAppeal;
  },

  // ── Warden & Chief Warden ────────────────────────────────────────────────
  getAllocationRuns: async (): Promise<MockAllocationRun[]> => {
    await delay();
    return MOCK_ALLOCATION_RUNS;
  },

  getWaitlist: async (): Promise<MockWaitlistEntry[]> => {
    await delay();
    return MOCK_WAITLIST;
  },

  promoteWaitlistStudent: async (id: string, reason: string): Promise<{ success: boolean }> => {
    await delay(250);
    const item = MOCK_WAITLIST.find((w) => w.id === id);
    if (item) {
      item.status = "promoted";
      item.promotedAt = new Date().toISOString();
      item.promotionReason = reason;
      item.promotedBy = "Prof. S. R. Kulkarni (Warden)";
    }
    return { success: true };
  },

  // ── Audit, Flags, Settings ───────────────────────────────────────────────
  getAuditLogs: async (): Promise<MockAuditEntry[]> => {
    await delay();
    return MOCK_AUDIT_LOGS;
  },

  getFeatureFlags: async () => {
    await delay();
    return currentFeatureFlags;
  },

  toggleFeatureFlag: async (key: string, enabled: boolean) => {
    await delay();
    const flag = currentFeatureFlags.find((f) => f.key === key);
    if (flag) flag.enabled = enabled;
    return flag;
  },

  getWeightVersions: async (): Promise<MockWeightSetting[]> => {
    await delay();
    return MOCK_WEIGHT_VERSIONS;
  },

  getApiKeys: async () => {
    await delay();
    return currentApiKeys;
  },

  getWebhooks: async () => {
    await delay();
    return currentWebhooks;
  },
};

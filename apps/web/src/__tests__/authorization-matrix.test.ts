import { describe, it, expect, vi, beforeEach } from "vitest";
import type { UserRole } from "@hostelhub/shared";
import type * as DbModule from "@hostelhub/db";
import { GET as healthRoute } from "../app/api/v1/health/route.js";
import { GET as reportsRoute } from "../app/api/v1/reports/[type]/route.js";
import { POST as rulesetsRoute } from "../app/api/v1/policy/rulesets/route.js";
import {
  GET as hostelsRoute,
  POST as hostelsPostRoute,
} from "../app/api/v1/inventory/hostels/route.js";
import { POST as roomsRoute } from "../app/api/v1/inventory/rooms/route.js";
import { POST as bedsRoute } from "../app/api/v1/inventory/beds/route.js";
import { GET as weightsRoute } from "../app/api/v1/weights-versions/route.js";
import { POST as simulationsRoute } from "../app/api/v1/simulations/route.js";
import { PATCH as verifyDocRoute } from "../app/api/v1/documents/[id]/verify/route.js";
import { POST as approveDraftRoute } from "../app/api/v1/drafts/[id]/approve/route.js";
import { POST as publishDraftRoute } from "../app/api/v1/drafts/[id]/publish/route.js";
import { POST as amendDraftRoute } from "../app/api/v1/drafts/[id]/amend/route.js";
import { GET as applicationsRoute } from "../app/api/v1/applications/route.js";

// Mock auth session state
let mockSessionUser: {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  institution_id: string;
  hostelAssignments?: string[];
} | null = null;

vi.mock("@/auth", () => ({
  auth: vi.fn().mockImplementation(async () => {
    if (!mockSessionUser) return null;
    return { user: mockSessionUser };
  }),
}));

// Mock repositories so handler testing does not require live MongoDB
vi.mock("@hostelhub/db", async (importOriginal) => {
  const actual = await importOriginal<typeof DbModule>();
  return {
    ...actual,
    ApplicationRepository: vi.fn().mockImplementation((instId) => ({
      institutionId: instId,
      paginate: vi.fn().mockResolvedValue({ items: [], total: 0 }),
      findById: vi.fn().mockResolvedValue(null),
    })),
    HostelRepository: vi.fn().mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue({ _id: "65f1a2b3c4d5e6f7a8b9c0d0", name: "Hostel 1" }),
      paginate: vi
        .fn()
        .mockResolvedValue({
          items: [],
          pagination: { limit: 20, nextCursor: null, hasNextPage: false },
        }),
      create: vi.fn().mockResolvedValue({ _id: "hostel_new", name: "Hostel New" }),
    })),
    BlockRepository: vi.fn().mockImplementation(() => ({
      findById: vi
        .fn()
        .mockResolvedValue({
          _id: "65f1a2b3c4d5e6f7a8b9c0d1",
          hostel_id: "65f1a2b3c4d5e6f7a8b9c0d0",
        }),
    })),
    RoomRepository: vi.fn().mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue({ _id: "65f1a2b3c4d5e6f7a8b9c0d2" }),
      paginate: vi
        .fn()
        .mockResolvedValue({
          items: [],
          pagination: { limit: 20, nextCursor: null, hasNextPage: false },
        }),
      create: vi.fn().mockResolvedValue({ _id: "room_new" }),
    })),
    BedRepository: vi.fn().mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue({ _id: "bed_1" }),
      paginate: vi
        .fn()
        .mockResolvedValue({
          items: [],
          pagination: { limit: 20, nextCursor: null, hasNextPage: false },
        }),
      create: vi.fn().mockResolvedValue({ _id: "bed_new" }),
    })),
    PolicyRuleSetRepository: vi.fn().mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([]),
      paginate: vi
        .fn()
        .mockResolvedValue({
          items: [],
          pagination: { limit: 20, nextCursor: null, hasNextPage: false },
        }),
      create: vi.fn().mockResolvedValue({ _id: "ruleset_new", name: "RuleSet New" }),
    })),
    WeightsVersionRepository: vi.fn().mockImplementation(() => ({
      findAll: vi.fn().mockResolvedValue([]),
    })),
    ApplicationDocumentRepository: vi.fn().mockImplementation(() => ({
      findById: vi.fn().mockResolvedValue({
        _id: "doc_123",
        status: "pending",
      }),
      update: vi.fn().mockResolvedValue({ _id: "doc_123", status: "verified" }),
    })),
    AuditService: {
      append: vi.fn().mockResolvedValue({}),
    },
  };
});

describe("Table-Driven Authorisation Matrix (API Route x Role)", () => {
  const ALL_ROLES: Array<UserRole | "anon"> = [
    "anon",
    "student",
    "warden",
    "chief_warden",
    "hostel_admin",
    "dean",
    "sys_admin",
  ];

  beforeEach(() => {
    mockSessionUser = null;
  });

  function setActor(role: UserRole | "anon", institutionId = "inst_tenant_1") {
    if (role === "anon") {
      mockSessionUser = null;
    } else {
      mockSessionUser = {
        id: `user_${role}_1`,
        email: `${role}@campus.edu`,
        name: `Test ${role}`,
        roles: [role],
        institution_id: institutionId,
        hostelAssignments: ["hostel_1"],
      };
    }
  }

  // ── Matrix of Routes & Permitted Roles ──────────────────────────────────────
  interface RouteTestCase {
    name: string;
    method: "GET" | "POST" | "PATCH";
    url: string;
    handler: (req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>;
    params?: Record<string, string>;
    body?: Record<string, unknown>;
    allowedRoles: UserRole[]; // 'anon' is allowed if public: true
    isPublic?: boolean;
  }

  const MATRIX_CASES: RouteTestCase[] = [
    {
      name: "GET /api/v1/health (Public)",
      method: "GET",
      url: "http://localhost:3000/api/v1/health",
      handler: (req) => healthRoute(req),
      allowedRoles: ["student", "warden", "chief_warden", "hostel_admin", "dean", "sys_admin"],
      isPublic: true,
    },
    {
      name: "GET /api/v1/reports/occupancy (analytics:read)",
      method: "GET",
      url: "http://localhost:3000/api/v1/reports/occupancy",
      handler: (req, ctx) => reportsRoute(req, ctx!),
      params: { type: "occupancy" },
      allowedRoles: ["dean"],
    },
    {
      name: "POST /api/v1/policy/rulesets (policy:rules)",
      method: "POST",
      url: "http://localhost:3000/api/v1/policy/rulesets",
      handler: (req) => rulesetsRoute(req),
      body: { name: "Test Policy Ruleset", rules: [] },
      allowedRoles: ["hostel_admin"],
    },
    {
      name: "POST /api/v1/inventory/hostels (inventory:manage)",
      method: "POST",
      url: "http://localhost:3000/api/v1/inventory/hostels",
      handler: (req) => hostelsPostRoute(req),
      body: { name: "Test Hall", gender_policy: "coed", address: "Main Campus" },
      allowedRoles: ["hostel_admin"],
    },
    {
      name: "POST /api/v1/inventory/rooms (inventory:manage)",
      method: "POST",
      url: "http://localhost:3000/api/v1/inventory/rooms",
      handler: (req) => roomsRoute(req),
      body: {
        block_id: "65f1a2b3c4d5e6f7a8b9c0d1",
        room_number: "101",
        room_type: "single",
        capacity: 1,
      },
      allowedRoles: ["hostel_admin"],
    },
    {
      name: "POST /api/v1/inventory/beds (inventory:manage)",
      method: "POST",
      url: "http://localhost:3000/api/v1/inventory/beds",
      handler: (req) => bedsRoute(req),
      body: {
        room_id: "65f1a2b3c4d5e6f7a8b9c0d2",
        bed_no: "B-101",
      },
      allowedRoles: ["hostel_admin"],
    },
    {
      name: "GET /api/v1/weights-versions (weights:configure)",
      method: "GET",
      url: "http://localhost:3000/api/v1/weights-versions",
      handler: (req) => weightsRoute(req),
      allowedRoles: ["sys_admin"],
    },
    {
      name: "POST /api/v1/simulations (allocation:run)",
      method: "POST",
      url: "http://localhost:3000/api/v1/simulations",
      handler: (req) => simulationsRoute(req),
      body: { cycle_id: "cycle_1", base_run_id: "run_1", scenarios: [] },
      allowedRoles: ["hostel_admin", "chief_warden"],
    },
    {
      name: "PATCH /api/v1/documents/:id/verify (document:verify)",
      method: "PATCH",
      url: "http://localhost:3000/api/v1/documents/doc_123/verify",
      handler: (req, ctx) => verifyDocRoute(req, ctx!),
      params: { id: "doc_123" },
      body: { status: "verified" },
      allowedRoles: ["hostel_admin"],
    },
    {
      name: "POST /api/v1/drafts/:id/approve (allocation:approve_own / escalated)",
      method: "POST",
      url: "http://localhost:3000/api/v1/drafts/draft_123/approve",
      handler: (req, ctx) => approveDraftRoute(req, ctx!),
      params: { id: "draft_123" },
      allowedRoles: ["warden", "chief_warden"],
    },
    {
      name: "POST /api/v1/drafts/:id/publish (allocation:publish_own)",
      method: "POST",
      url: "http://localhost:3000/api/v1/drafts/draft_123/publish",
      handler: (req, ctx) => publishDraftRoute(req, ctx!),
      params: { id: "draft_123" },
      allowedRoles: ["warden", "chief_warden"],
    },
    {
      name: "POST /api/v1/drafts/:id/amend (allocation:override_own)",
      method: "POST",
      url: "http://localhost:3000/api/v1/drafts/draft_123/amend",
      handler: (req, ctx) => amendDraftRoute(req, ctx!),
      params: { id: "draft_123" },
      body: { changes: [] },
      allowedRoles: ["warden", "chief_warden"],
    },
    {
      name: "GET /api/v1/applications (Authenticated Session Required)",
      method: "GET",
      url: "http://localhost:3000/api/v1/applications",
      handler: (req) => applicationsRoute(req),
      allowedRoles: ["student", "warden", "chief_warden", "hostel_admin", "dean", "sys_admin"],
    },
  ];

  for (const testCase of MATRIX_CASES) {
    describe(testCase.name, () => {
      for (const role of ALL_ROLES) {
        const shouldBeAllowed =
          role === "anon" ? Boolean(testCase.isPublic) : testCase.allowedRoles.includes(role);

        it(`evaluates role '${role}' -> ${shouldBeAllowed ? "ALLOWED" : "FORBIDDEN/UNAUTHORIZED"}`, async () => {
          setActor(role);

          const req = new Request(testCase.url, {
            method: testCase.method,
            headers: {
              "Content-Type": "application/json",
              ...(testCase.body ? { "Idempotency-Key": "test-key-123" } : {}),
            },
            body: testCase.body ? JSON.stringify(testCase.body) : null,
          });

          const ctx = testCase.params ? { params: Promise.resolve(testCase.params) } : undefined;

          const res = await testCase.handler(req, ctx);

          if (shouldBeAllowed) {
            // Must NOT be 401 or 403
            expect(res.status).not.toBe(401);
            expect(res.status).not.toBe(403);
          } else {
            if (role === "anon") {
              // Unauthenticated must return 401 Unauthorized
              expect(res.status).toBe(401);
            } else {
              // Authenticated but lacking permission must return 403 Forbidden
              expect(res.status).toBe(403);
            }
          }
        });
      }
    });
  }

  // ── Cross-Tenant Isolation Tests ───────────────────────────────────────────
  describe("Cross-Tenant Isolation Checks", () => {
    it("ensures institution context in API handler is strictly bound to session tenant", async () => {
      // User belongs to Tenant Alpha
      setActor("hostel_admin", "tenant_alpha_123");

      // Attacker attempts to provide a different tenant header
      const req = new Request("http://localhost:3000/api/v1/inventory/hostels", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-institution-id": "tenant_beta_victim_999",
        },
      });

      const res = await hostelsRoute(req);
      expect(res.status).toBe(200);

      // Verify that the repository was instantiated with tenant_alpha_123, NOT tenant_beta
      const { HostelRepository } = await import("@hostelhub/db");
      expect(HostelRepository).toHaveBeenCalledWith("tenant_alpha_123");
    });

    it("ensures student application queries are strictly scoped to authenticated user ID", async () => {
      setActor("student", "tenant_alpha_123");

      const req = new Request(
        "http://localhost:3000/api/v1/applications?student_id=other_student",
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
      );

      const res = await applicationsRoute(req);
      expect(res.status).toBe(200);

      const { ApplicationRepository } = await import("@hostelhub/db");
      const appRepoInstance = vi.mocked(ApplicationRepository).mock.results[0]?.value;
      if (appRepoInstance) {
        expect(appRepoInstance.paginate).toHaveBeenCalledWith(
          expect.objectContaining({
            student_id: "user_student_1",
          }),
          expect.anything(),
        );
      }
    });
  });
});

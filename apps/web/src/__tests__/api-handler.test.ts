import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { apiHandler } from "../lib/api/handler.js";
import { requireIfMatch, formatETag } from "../lib/api/etag.js";
import { paginationQuerySchema, createPaginatedResponse } from "../lib/api/pagination.js";
import { clearMemoryIdempotencyStore } from "../lib/api/idempotency.js";
import { VersionConflictError } from "@hostelhub/db";

// Mock Auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

describe("Shared API Infrastructure (apiHandler)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearMemoryIdempotencyStore();
  });

  describe("RFC 9457 Validation Errors", () => {
    const handler = apiHandler(
      {
        public: true,
        body: z.object({
          email: z.string().email(),
          age: z.number().int().min(18),
        }),
      },
      async ({ body }) => {
        return { success: true, received: body };
      },
    );

    it("returns 422 Problem Details when payload is invalid", async () => {
      const req = new Request("http://localhost:3000/api/v1/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid-email", age: 15 }),
      });

      const res = await handler(req);
      const problem = await res.json();

      expect(res.status).toBe(422);
      expect(res.headers.get("content-type")).toContain("application/problem+json");
      expect(res.headers.get("x-request-id")).toBeTruthy();

      expect(problem.type).toContain("validation-failed");
      expect(problem.title).toBe("Validation Failed");
      expect(problem.code).toBe("VALIDATION_FAILED");
      expect(problem.status).toBe(422);
      expect(problem.invalidParams).toBeDefined();
      expect(problem.invalidParams).toHaveLength(2);
    });

    it("returns 200 with result when payload is valid", async () => {
      const req = new Request("http://localhost:3000/api/v1/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "student@nit.edu", age: 20 }),
      });

      const res = await handler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.received.email).toBe("student@nit.edu");
    });
  });

  describe("Authentication & Authorisation (Forbidden / Unauthorized)", () => {
    const protectedHandler = apiHandler(
      {
        permission: "weights:configure", // requires sys_admin
      },
      async ({ user }) => {
        return { granted: true, user: user?.name };
      },
    );

    it("returns 401 UNAUTHORIZED when session is missing", async () => {
      mockAuth.mockResolvedValue(null as never);

      const req = new Request("http://localhost:3000/api/v1/sys/weights");
      const res = await protectedHandler(req);
      const problem = await res.json();

      expect(res.status).toBe(401);
      expect(problem.code).toBe("UNAUTHORIZED");
      expect(res.headers.get("content-type")).toContain("application/problem+json");
    });

    it("returns 403 FORBIDDEN when user lacks the required permission", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "usr_student",
          email: "student@nit.edu",
          name: "Student",
          roles: ["student"],
          institution_id: "inst_1",
          hostelAssignments: [],
          mfaEnabled: false,
          mfaPending: false,
        },
      } as never);

      const req = new Request("http://localhost:3000/api/v1/sys/weights");
      const res = await protectedHandler(req);
      const problem = await res.json();

      expect(res.status).toBe(403);
      expect(problem.code).toBe("FORBIDDEN");
      expect(problem.detail).toContain("lacks required permission");
    });

    it("allows execution when user has the required permission", async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: "usr_sysadmin",
          email: "sysadmin@nit.edu",
          name: "System Admin",
          roles: ["sys_admin"],
          institution_id: "inst_1",
          hostelAssignments: [],
          mfaEnabled: true,
          mfaPending: false,
        },
      } as never);

      const req = new Request("http://localhost:3000/api/v1/sys/weights");
      const res = await protectedHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.granted).toBe(true);
      expect(data.user).toBe("System Admin");
    });
  });

  describe("Idempotency Replay & Conflict Prevention", () => {
    let callCount = 0;
    const idempotentHandler = apiHandler(
      {
        public: true,
        idempotent: true,
      },
      async () => {
        callCount++;
        return { orderId: "ORD-" + callCount, timestamp: Date.now() };
      },
    );

    it("rejects request when Idempotency-Key header is missing", async () => {
      const req = new Request("http://localhost:3000/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: "room_booking" }),
      });

      const res = await idempotentHandler(req);
      const problem = await res.json();

      expect(res.status).toBe(400);
      expect(problem.code).toBe("MISSING_IDEMPOTENCY_KEY");
    });

    it("replays cached response on duplicate request with same key and body", async () => {
      callCount = 0;
      const key = `key-test-uuid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const payload = JSON.stringify({ item: "room_booking" });

      // First Request
      const req1 = new Request("http://localhost:3000/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: payload,
      });

      const res1 = await idempotentHandler(req1);
      const data1 = await res1.json();

      expect(res1.status).toBe(200);
      expect(data1.orderId).toBe("ORD-1");
      expect(res1.headers.get("x-idempotent-replay")).toBeNull();

      // Second Request with identical payload
      const req2 = new Request("http://localhost:3000/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: payload,
      });

      const res2 = await idempotentHandler(req2);
      const data2 = await res2.json();

      expect(res2.status).toBe(200);
      expect(data2.orderId).toBe("ORD-1"); // Cached response, not ORD-2!
      expect(res2.headers.get("x-idempotent-replay")).toBe("true");
      expect(callCount).toBe(1);
    });

    it("rejects request when idempotency key is reused with a different payload", async () => {
      const key = "key-test-conflict-67890";

      // First call with payload A
      const req1 = new Request("http://localhost:3000/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({ amount: 100 }),
      });
      await idempotentHandler(req1);

      // Second call with payload B
      const req2 = new Request("http://localhost:3000/api/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify({ amount: 500 }), // Different body!
      });

      const res2 = await idempotentHandler(req2);
      const problem = await res2.json();

      expect(res2.status).toBe(409);
      expect(problem.code).toBe("IDEMPOTENCY_CONFLICT");
    });
  });

  describe("Optimistic Concurrency & ETag / If-Match", () => {
    it("formats and parses weak ETags correctly", () => {
      expect(formatETag(1)).toBe('W/"1"');
      expect(formatETag(42)).toBe('W/"42"');
    });

    const updateHandler = apiHandler(
      {
        public: true,
      },
      async ({ req }) => {
        const currentVersion = 5;
        requireIfMatch(req, currentVersion);
        return { updated: true, newVersion: 6 };
      },
    );

    it("succeeds when If-Match matches the current version", async () => {
      const req = new Request("http://localhost:3000/api/v1/resource/123", {
        method: "PUT",
        headers: {
          "If-Match": 'W/"5"',
        },
      });

      const res = await updateHandler(req);
      expect(res.status).toBe(200);
    });

    it("returns 412 PRECONDITION_FAILED when If-Match version is mismatched", async () => {
      const req = new Request("http://localhost:3000/api/v1/resource/123", {
        method: "PUT",
        headers: {
          "If-Match": 'W/"4"', // stale version!
        },
      });

      const res = await updateHandler(req);
      const problem = await res.json();

      expect(res.status).toBe(412);
      expect(problem.code).toBe("PRECONDITION_FAILED");
    });

    it("converts thrown VersionConflictError to 409 VERSION_CONFLICT Problem", async () => {
      const conflictHandler = apiHandler({ public: true }, async () => {
        throw new VersionConflictError("doc_123", 2, 3);
      });

      const res = await conflictHandler();
      const problem = await res.json();

      expect(res.status).toBe(409);
      expect(problem.code).toBe("VERSION_CONFLICT");
      expect(problem.expectedVersion).toBe(2);
      expect(problem.actualVersion).toBe(3);
    });
  });

  describe("Cursor Pagination Helper", () => {
    it("parses valid pagination query parameters and applies defaults", () => {
      const parsedDefault = paginationQuerySchema.parse({});
      expect(parsedDefault.limit).toBe(20);
      expect(parsedDefault.sortField).toBe("_id");
      expect(parsedDefault.sortOrder).toBe("asc");

      const parsedCustom = paginationQuerySchema.parse({
        limit: "50",
        cursor: "eyJpZCI6IjEyMyJ9",
        sortField: "createdAt",
        sortOrder: "desc",
      });
      expect(parsedCustom.limit).toBe(50);
      expect(parsedCustom.cursor).toBe("eyJpZCI6IjEyMyJ9");
      expect(parsedCustom.sortField).toBe("createdAt");
      expect(parsedCustom.sortOrder).toBe("desc");
    });

    it("formats standard paginated envelope with nextCursor", () => {
      const items = [{ id: 1 }, { id: 2 }];
      const res = createPaginatedResponse(items, 2, "next-cursor-token", 100);

      expect(res.items).toEqual(items);
      expect(res.pagination.limit).toBe(2);
      expect(res.pagination.nextCursor).toBe("next-cursor-token");
      expect(res.pagination.hasNextPage).toBe(true);
      expect(res.pagination.total).toBe(100);
    });
  });

  describe("Per-Route Rate Limiting", () => {
    const rateLimitedHandler = apiHandler(
      {
        public: true,
        rateLimit: {
          limit: 2,
          windowSeconds: 30,
        },
      },
      async () => ({ ok: true }),
    );

    it("blocks request with 429 RATE_LIMITED after exceeding route limit", async () => {
      const req = () =>
        new Request("http://localhost:3000/api/v1/limited", {
          headers: { "x-forwarded-for": "192.168.1.100" },
        });

      // 1st request ok
      const r1 = await rateLimitedHandler(req());
      expect(r1.status).toBe(200);

      // 2nd request ok
      const r2 = await rateLimitedHandler(req());
      expect(r2.status).toBe(200);

      // 3rd request blocked
      const r3 = await rateLimitedHandler(req());
      const problem = await r3.json();

      expect(r3.status).toBe(429);
      expect(problem.code).toBe("RATE_LIMITED");
      expect(r3.headers.get("retry-after")).toBeTruthy();
    });
  });
});

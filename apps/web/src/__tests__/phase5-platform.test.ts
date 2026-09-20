import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import { apiHandler } from "@/lib/api/handler";
import { GET as openApiRoute } from "@/app/api/v1/openapi.json/route";
import {
  checkIdempotency,
  saveIdempotentResponse,
  clearMemoryIdempotencyStore,
} from "@/lib/api/idempotency";

describe("Phase 5: API Platform Security & Resiliency", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearMemoryIdempotencyStore();
  });

  describe("1. Malformed JSON & Body Size Limit", () => {
    it("returns 400 for malformed JSON request body", async () => {
      const route = apiHandler(
        { public: true, body: z.object({ name: z.string() }) },
        async ({ body }) => body,
      );

      const req = new Request("http://localhost:3000/api/v1/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid_json: ",
      });

      const res = await route(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.detail).toMatch(/JSON/i);
    });

    it("returns 413 when request body exceeds size limit", async () => {
      const route = apiHandler(
        { public: true, body: z.object({ data: z.string() }) },
        async ({ body }) => body,
      );

      const largePayload = "a".repeat(1.5 * 1024 * 1024);
      const req = new Request("http://localhost:3000/api/v1/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: largePayload }),
      });

      const res = await route(req);
      expect(res.status).toBe(413);
      const json = await res.json();
      expect(json.detail).toMatch(/exceeds/i);
    });
  });

  describe("2. Idempotency Scoping & In-Flight Reservation", () => {
    it("scopes idempotency keys by institution + user + method + route", async () => {
      const key = "idemp_test_123";
      const inst = "inst_A";
      const user = "usr_1";
      const body = JSON.stringify({ action: "create" });

      // First call checks and reserves
      const firstCheck = await checkIdempotency(key, inst, body, user, "POST", "/api/v1/groups");
      expect(firstCheck.isReplay).toBe(false);

      await saveIdempotentResponse(
        key,
        inst,
        body,
        200,
        { "Content-Type": "application/json" },
        JSON.stringify({ ok: true }),
        user,
        "POST",
        "/api/v1/groups",
      );

      // Second identical call is recognized as replay
      const secondCheck = await checkIdempotency(key, inst, body, user, "POST", "/api/v1/groups");
      expect(secondCheck.isReplay).toBe(true);

      // Call on DIFFERENT route with same key is NOT a replay
      const diffRouteCheck = await checkIdempotency(
        key,
        inst,
        body,
        user,
        "POST",
        "/api/v1/applications",
      );
      expect(diffRouteCheck.isReplay).toBe(false);
    });
  });

  describe("3. Production Gating of OpenApi Spec", () => {
    it("gates /api/v1/openapi.json in production environment", () => {
      vi.stubEnv("NODE_ENV", "production");
      try {
        const res = openApiRoute();
        expect(res.status).toBe(404);
      } finally {
        vi.unstubAllEnvs();
      }
    });
  });
});

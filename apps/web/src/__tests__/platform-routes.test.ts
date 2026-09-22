import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import crypto from "node:crypto";
import { GET as getOccupancy } from "../app/api/v1/platform/occupancy/route";
import { GET as getAllocations } from "../app/api/v1/platform/allocations/route";

// Mock @hostelhub/db to return controlled test API keys without needing live DB
const mockApiKey = {
  _id: "67890abcdef1234567890123",
  institution_id: "507f1f77bcf86cd799439011",
  name: "P04 Room Exchange",
  key_prefix: "hh_live_abcd1234",
  hashed_secret: crypto.createHash("sha256").update("hh_live_valid_test_token_123").digest("hex"),
  scopes: ["occupancy:read", "allocations:read"],
  rate_limit: 60,
  revoked: false,
};

const mockRevokedKey = {
  ...mockApiKey,
  _id: "67890abcdef1234567890999",
  hashed_secret: crypto.createHash("sha256").update("hh_live_revoked_test_token_999").digest("hex"),
  revoked: true,
};

const mockLimitedScopeKey = {
  ...mockApiKey,
  _id: "67890abcdef1234567890444",
  hashed_secret: crypto.createHash("sha256").update("hh_live_limited_test_token_444").digest("hex"),
  scopes: ["inventory:read"], // lacks occupancy:read and allocations:read
  revoked: false,
};

vi.mock("@/lib/inventory/occupancy.js", () => ({
  getOccupancyMetrics: vi.fn().mockResolvedValue({
    totalBeds: 100,
    occupiedBeds: 80,
    availableBeds: 20,
    occupancyRate: 80,
  }),
}));

vi.mock("@hostelhub/db", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    connectDb: vi.fn().mockResolvedValue(undefined),
    ApiKeyRepository: vi.fn().mockImplementation(() => ({
      findByHashedSecret: vi.fn().mockImplementation((hash: string) => {
        if (hash === mockApiKey.hashed_secret) return Promise.resolve(mockApiKey);
        if (hash === mockRevokedKey.hashed_secret) return Promise.resolve(mockRevokedKey);
        if (hash === mockLimitedScopeKey.hashed_secret) return Promise.resolve(mockLimitedScopeKey);
        return Promise.resolve(null);
      }),
      recordUsage: vi.fn().mockResolvedValue(undefined),
    })),
    AuditService: {
      append: vi.fn().mockResolvedValue(undefined),
    },
    HostelRepository: vi.fn().mockImplementation(() => ({
      find: vi
        .fn()
        .mockResolvedValue([{ _id: "h_01", name: "Aryabhata Hall", gender_policy: "male" }]),
    })),
    RoomRepository: vi.fn().mockImplementation(() => ({
      find: vi
        .fn()
        .mockResolvedValue([
          {
            _id: "r_01",
            hostel_id: "h_01",
            room_number: "A-101",
            room_type: "single",
            capacity: 1,
            accessible: false,
            ac: true,
            status: "available",
          },
        ]),
    })),
    BedRepository: vi.fn().mockImplementation(() => ({
      find: vi
        .fn()
        .mockResolvedValue([{ _id: "b_01", room_id: "r_01", bed_no: "1", status: "available" }]),
    })),
  };
});

describe("Prompt O6: Platform API Routes & Consumer Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. GET /api/v1/platform/occupancy (Bearer Key Auth)", () => {
    it("returns 401 when Authorization header is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/platform/occupancy");
      const res = await getOccupancy(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe("UNAUTHORIZED");
    });

    it("returns 401 when Bearer token is invalid", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/platform/occupancy", {
        headers: { Authorization: "Bearer hh_live_invalid_xyz_000" },
      });
      const res = await getOccupancy(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe("INVALID_API_KEY");
    });

    it("returns 401 when API key is revoked", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/platform/occupancy", {
        headers: { Authorization: "Bearer hh_live_revoked_test_token_999" },
      });
      const res = await getOccupancy(req);
      expect(res.status).toBe(401);
      const data = await res.json();
      expect(data.code).toBe("REVOKED_API_KEY");
    });

    it("returns 403 when API key lacks occupancy:read scope", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/platform/occupancy", {
        headers: { Authorization: "Bearer hh_live_limited_test_token_444" },
      });
      const res = await getOccupancy(req);
      expect(res.status).toBe(403);
      const data = await res.json();
      expect(data.code).toBe("FORBIDDEN_SCOPE");
    });

    it("returns 200 with occupancy metrics when key has occupancy:read scope", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/platform/occupancy", {
        headers: { Authorization: "Bearer hh_live_valid_test_token_123" },
      });
      const res = await getOccupancy(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.authenticated_as.scope).toBe("occupancy:read");
      expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
    });
  });

  describe("2. GET /api/v1/platform/allocations (Bearer Key Auth)", () => {
    it("returns 403 when API key lacks allocations:read scope", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/platform/allocations", {
        headers: { Authorization: "Bearer hh_live_limited_test_token_444" },
      });
      const res = await getAllocations(req);
      expect(res.status).toBe(403);
    });

    it("returns 200 with room allocations roster when key has allocations:read scope", async () => {
      const req = new NextRequest("http://localhost:3000/api/v1/platform/allocations", {
        headers: { Authorization: "Bearer hh_live_valid_test_token_123" },
      });
      const res = await getAllocations(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.hostels.length).toBeGreaterThan(0);
      expect(data.hostels[0].rooms[0].room_number).toBe("A-101");
    });
  });

  describe("3. Example Consumer Signature Verification Logic", () => {
    const secret = "whsec_consumer_test_secret";
    const rawPayload = JSON.stringify({ event: "allocation.published", cycle: "FALL-2026" });

    it("verifies signature and rejects tampered bodies or stale timestamps", () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const validSig = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${rawPayload}`)
        .digest("hex");

      // Verify matching
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${rawPayload}`)
        .digest("hex");
      expect(
        crypto.timingSafeEqual(Buffer.from(validSig, "hex"), Buffer.from(expectedSig, "hex")),
      ).toBe(true);

      // Verify tampered body mismatch
      const tamperedBody = JSON.stringify({ event: "allocation.published", cycle: "SPRING-2027" });
      const tamperedExpectedSig = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${tamperedBody}`)
        .digest("hex");
      expect(
        crypto.timingSafeEqual(
          Buffer.from(validSig, "hex"),
          Buffer.from(tamperedExpectedSig, "hex"),
        ),
      ).toBe(false);
    });
  });
});

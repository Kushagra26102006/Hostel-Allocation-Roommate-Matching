/**
 * Tests for GET /api/v1/ready
 *
 * All dependency modules are mocked so these tests run fully offline
 * without Docker. We test:
 *  1. All deps healthy → 200 + all "ok"
 *  2. Redis down → 503 + redis shows error, mongo/minio still "ok"
 *  3. Multiple deps down → 503 + correct per-dep messages
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock the lib singletons before importing the route ────────────────────────
vi.mock("@/lib/mongo", () => ({
  pingMongo: vi.fn(),
}));
vi.mock("@/lib/redis", () => ({
  pingRedis: vi.fn(),
}));
vi.mock("@/lib/minio", () => ({
  pingMinio: vi.fn(),
}));

// ── Import mocks + route handler ──────────────────────────────────────────────
import { pingMongo } from "@/lib/mongo";
import { pingRedis } from "@/lib/redis";
import { pingMinio } from "@/lib/minio";
import { GET } from "../app/api/v1/ready/route.js";

const mockPingMongo = vi.mocked(pingMongo);
const mockPingRedis = vi.mocked(pingRedis);
const mockPingMinio = vi.mocked(pingMinio);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/v1/ready", () => {
  it("returns 200 with all deps ok when everything is healthy", async () => {
    mockPingMongo.mockResolvedValue(undefined);
    mockPingRedis.mockResolvedValue(undefined);
    mockPingMinio.mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.deps.mongo).toBe("ok");
    expect(body.deps.redis).toBe("ok");
    expect(body.deps.minio).toBe("ok");
  });

  it("returns 503 when Redis is down, naming the failing dependency", async () => {
    mockPingMongo.mockResolvedValue(undefined);
    mockPingRedis.mockRejectedValue(new Error("Connection refused"));
    mockPingMinio.mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.deps.mongo).toBe("ok");
    expect(body.deps.redis).toContain("Connection refused");
    expect(body.deps.minio).toBe("ok");
  });

  it("returns 503 when multiple deps are down", async () => {
    mockPingMongo.mockRejectedValue(new Error("Mongo timeout"));
    mockPingRedis.mockRejectedValue(new Error("Redis timeout"));
    mockPingMinio.mockResolvedValue(undefined);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.status).toBe("degraded");
    expect(body.deps.mongo).toContain("Mongo timeout");
    expect(body.deps.redis).toContain("Redis timeout");
    expect(body.deps.minio).toBe("ok");
  });

  it("returns 503 when MinIO bucket is not found", async () => {
    mockPingMongo.mockResolvedValue(undefined);
    mockPingRedis.mockResolvedValue(undefined);
    mockPingMinio.mockRejectedValue(new Error("NoSuchBucket"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.deps.minio).toContain("NoSuchBucket");
  });
});

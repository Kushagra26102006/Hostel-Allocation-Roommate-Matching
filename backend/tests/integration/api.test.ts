import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { signAccessToken } from "../../src/common/security/tokens.js";

describe("HostelHub API Integration Tests", () => {
  const app = createApp();

  it("GET /health returns status UP", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("UP");
    expect(res.body.version).toBe("1.0.0");
  });

  it("GET /ready returns readiness status", async () => {
    const res = await request(app).get("/ready");
    expect(res.status === 200 || res.status === 503).toBe(true);
    expect(res.body.dependencies).toBeDefined();
  });

  it("GET /api/v1/inventory/hostels without auth returns 401 with RFC 9457 Problem Details", async () => {
    const res = await request(app).get("/api/v1/inventory/hostels");
    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body.code).toBe("TOKEN_MISSING");
  });

  it("GET /api/v1/auth/me with invalid Bearer token returns 401 Problem Details", async () => {
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid-malformed-token");

    expect(res.status).toBe(401);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body.code).toBe("TOKEN_INVALID");
  });

  it("GET /unknown-path returns 404 RFC 9457 Problem Details", async () => {
    const res = await request(app).get("/non-existent-api-endpoint");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

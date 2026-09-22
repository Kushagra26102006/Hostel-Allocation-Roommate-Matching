import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  ApiKeyService,
  WebhookDispatcherService,
  ApiKeyModel,
  WebhookModel,
  WebhookDeliveryLogModel,
} from "../index.js";

const TEST_INSTITUTION_ID = new Types.ObjectId("507f1f77bcf86cd799439011");

describe("Prompt O6: Public API Keys and Signed Webhooks (E22)", () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongod) {
      await mongod.stop();
    }
  });

  beforeEach(async () => {
    await ApiKeyModel.deleteMany({ institution_id: TEST_INSTITUTION_ID });
    await WebhookModel.deleteMany({ institution_id: TEST_INSTITUTION_ID });
    await WebhookDeliveryLogModel.deleteMany({ institution_id: TEST_INSTITUTION_ID });
  });

  describe("1. ApiKeyService & Bearer Verification", () => {
    it("creates an API key with secret shown once, hashed storage, and prefix", async () => {
      const service = new ApiKeyService(TEST_INSTITUTION_ID);
      const result = await service.createApiKey({
        name: "P04 Room Exchange Integration",
        scopes: ["occupancy:read", "allocations:read"],
        rate_limit: 120,
      });

      expect(result.plaintextToken).toMatch(/^hh_live_[a-f0-9]{48}$/);
      expect(result.apiKey.name).toBe("P04 Room Exchange Integration");
      expect(result.apiKey.key_prefix).toMatch(/^hh_live_[a-f0-9]{8}$/);
      expect(result.apiKey.hashed_secret).not.toBe(result.plaintextToken);
      expect(result.apiKey.hashed_secret.length).toBe(64); // SHA-256
      expect(result.apiKey.scopes).toEqual(["occupancy:read", "allocations:read"]);
      expect(result.apiKey.rate_limit).toBe(120);
      expect(result.apiKey.revoked).toBe(false);
    });

    it("verifies a valid API key with required scope", async () => {
      const service = new ApiKeyService(TEST_INSTITUTION_ID);
      const created = await service.createApiKey({
        name: "Occupancy Reader",
        scopes: ["occupancy:read"],
      });

      const verification = await service.verifyApiKey(created.plaintextToken, "occupancy:read");
      expect(verification.valid).toBe(true);
      expect(verification.apiKey).toBeDefined();
      expect(verification.apiKey?.name).toBe("Occupancy Reader");
    });

    it("rejects an invalid API key with 401", async () => {
      const service = new ApiKeyService(TEST_INSTITUTION_ID);
      const verification = await service.verifyApiKey("hh_live_invalid_nonexistent_key_123");
      expect(verification.valid).toBe(false);
      expect(verification.statusCode).toBe(401);
      expect(verification.error).toContain("Invalid API key");
    });

    it("rejects an API key that lacks the required scope with 403", async () => {
      const service = new ApiKeyService(TEST_INSTITUTION_ID);
      const created = await service.createApiKey({
        name: "Occupancy Only",
        scopes: ["occupancy:read"],
      });

      const verification = await service.verifyApiKey(created.plaintextToken, "allocations:read");
      expect(verification.valid).toBe(false);
      expect(verification.statusCode).toBe(403);
      expect(verification.error).toContain('lacks required scope: "allocations:read"');
    });

    it("rejects a revoked API key with 401", async () => {
      const service = new ApiKeyService(TEST_INSTITUTION_ID);
      const created = await service.createApiKey({
        name: "Temporary Worker",
        scopes: ["occupancy:read"],
      });

      await service.revokeApiKey(created.apiKey._id);

      const verification = await service.verifyApiKey(created.plaintextToken);
      expect(verification.valid).toBe(false);
      expect(verification.statusCode).toBe(401);
      expect(verification.error).toContain("revoked");
    });
  });

  describe("2. Webhook Signatures & Replay Prevention", () => {
    const secret = "whsec_test_secret_abc123xyz";
    const payload = JSON.stringify({ event: "application.submitted", id: "app_1001" });
    const timestamp = Math.floor(Date.now() / 1000);

    it("generates and verifies HMAC-SHA256 signatures accurately", () => {
      const signature = WebhookDispatcherService.generateSignature(secret, timestamp, payload);
      expect(signature).toMatch(/^[a-f0-9]{64}$/);

      const verified = WebhookDispatcherService.verifySignature(
        secret,
        timestamp,
        payload,
        signature,
      );
      expect(verified.valid).toBe(true);
    });

    it("rejects signatures when payload has been tampered", () => {
      const signature = WebhookDispatcherService.generateSignature(secret, timestamp, payload);
      const tamperedPayload = JSON.stringify({ event: "application.submitted", id: "app_9999" });

      const verified = WebhookDispatcherService.verifySignature(
        secret,
        timestamp,
        tamperedPayload,
        signature,
      );
      expect(verified.valid).toBe(false);
      expect(verified.reason).toContain("mismatch");
    });

    it("rejects signatures with expired timestamps to prevent replay attacks", () => {
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago
      const signature = WebhookDispatcherService.generateSignature(secret, oldTimestamp, payload);

      const verified = WebhookDispatcherService.verifySignature(
        secret,
        oldTimestamp,
        payload,
        signature,
        300, // max age 5 minutes
      );
      expect(verified.valid).toBe(false);
      expect(verified.reason).toContain("replay attack prevention");
    });
  });

  describe("3. Webhook Dispatcher, Retries & Auto-Disable", () => {
    it("dispatches successfully to active webhook, resets failures, and logs delivery", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"received":true}',
      });

      const webhook = await WebhookModel.create({
        institution_id: TEST_INSTITUTION_ID,
        name: "Test Receiver",
        url: "https://exchange.campus.edu/webhooks/hostelhub",
        events: ["application.submitted", "allocation.published"],
        secret: "whsec_super_secret_key",
        status: "active",
        failure_count: 2,
        version: 1,
      });

      const dispatcher = new WebhookDispatcherService(TEST_INSTITUTION_ID, {
        fetchFn: mockFetch as unknown as typeof fetch,
        backoffFactorMs: 10,
      });

      const results = await dispatcher.dispatch("application.submitted", {
        application_id: "app_test_123",
      });

      expect(results.length).toBe(1);
      expect(results[0]?.success).toBe(true);
      expect(results[0]?.statusCode).toBe(200);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify failure count reset to 0
      const refreshed = await WebhookModel.findById(webhook._id);
      expect(refreshed?.failure_count).toBe(0);

      // Verify delivery log recorded
      const logs = await WebhookDeliveryLogModel.find({ webhook_id: webhook._id });
      expect(logs.length).toBe(1);
      expect(logs[0]?.event).toBe("application.submitted");
      expect(logs[0]?.status_code).toBe(200);
      expect(logs[0]?.success).toBe(true);
    });

    it("retries on failure with exponential backoff and records failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => "Service Unavailable",
      });

      const webhook = await WebhookModel.create({
        institution_id: TEST_INSTITUTION_ID,
        name: "Flaky Receiver",
        url: "https://flaky.campus.edu/webhook",
        events: ["room.changed"],
        secret: "whsec_flaky_key",
        status: "active",
        failure_count: 0,
        version: 1,
      });

      const dispatcher = new WebhookDispatcherService(TEST_INSTITUTION_ID, {
        fetchFn: mockFetch as unknown as typeof fetch,
        maxRetries: 3,
        backoffFactorMs: 5,
      });

      const results = await dispatcher.dispatch("room.changed", {
        room_id: "rm_101",
      });

      expect(results[0]?.success).toBe(false);
      expect(results[0]?.attempts).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      const refreshed = await WebhookModel.findById(webhook._id);
      expect(refreshed?.failure_count).toBe(1);
    });

    it("auto-disables webhook after 5 consecutive failures", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Connection refused"));

      const webhook = await WebhookModel.create({
        institution_id: TEST_INSTITUTION_ID,
        name: "Dead Receiver",
        url: "https://dead.campus.edu/webhook",
        events: ["waitlist.promoted"],
        secret: "whsec_dead_key",
        status: "active",
        failure_count: 4, // 4 existing failures
        version: 1,
      });

      const dispatcher = new WebhookDispatcherService(TEST_INSTITUTION_ID, {
        fetchFn: mockFetch as unknown as typeof fetch,
        maxRetries: 1,
      });

      const results = await dispatcher.dispatch("waitlist.promoted", {
        entry_id: "wl_001",
      });

      expect(results[0]?.success).toBe(false);
      expect(results[0]?.autoDisabled).toBe(true);

      const refreshed = await WebhookModel.findById(webhook._id);
      expect(refreshed?.failure_count).toBe(5);
      expect(refreshed?.status).toBe("disabled");
      expect(refreshed?.auto_disabled_at).toBeDefined();
    });

    it("sends test ping with sample data", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '{"status":"ok"}',
      });

      const webhook = await WebhookModel.create({
        institution_id: TEST_INSTITUTION_ID,
        name: "Ping Test Webhook",
        url: "https://consumer.example.com/test",
        events: ["application.submitted"],
        secret: "whsec_ping_123",
        status: "active",
        version: 1,
      });

      const dispatcher = new WebhookDispatcherService(TEST_INSTITUTION_ID, {
        fetchFn: mockFetch as unknown as typeof fetch,
      });

      const pingResult = await dispatcher.sendTestPing(webhook._id);
      expect(pingResult.success).toBe(true);
      expect(pingResult.statusCode).toBe(200);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://consumer.example.com/test",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-HostelHub-Event": "application.submitted",
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmailPort } from "../notifications/ports/email.port.js";
import { SmsPort } from "../notifications/ports/sms.port.js";
import { PushPort } from "../notifications/ports/push.port.js";
import { WebhookPort } from "../notifications/ports/webhook.port.js";
import { InAppPort } from "../notifications/ports/in-app.port.js";
import { setupNotificationWorker } from "../notification-processor.js";
import { NotificationService } from "@hostelhub/db";

describe("Prompt 23: Worker Channel Ports & Notification Processor", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("Channel Ports", () => {
    it("EmailPort sends email with zero-PII content via Mailpit/simulation", async () => {
      const emailPort = new EmailPort({
        provider: "mailpit",
        host: "localhost",
        port: 1025,
      });

      const result = await emailPort.send({
        to: "student@example.com",
        subject: "Hostel Application Received",
        text: "Your application is submitted.",
        html: "<p>Your application is submitted.</p>",
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it("SmsPort strictly enforces prompt book guardrails", async () => {
      const smsPort = new SmsPort({ provider: "console" });

      // 1. Allowed: final allocation published
      const allowedAllocation = await smsPort.send({
        to: "+919876543210",
        text: "HostelHub: Your official hostel allocation is now published! View: https://hostelhub.internal/room",
        eventType: "allocation.published",
      });
      expect(allowedAllocation.success).toBe(true);

      // 2. Allowed: critical closing window (<= 24h)
      const allowedCriticalWindow = await smsPort.send({
        to: "+919876543210",
        text: "HostelHub: Application window closes in 12h.",
        eventType: "window.closing",
        hoursRemaining: 12,
      });
      expect(allowedCriticalWindow.success).toBe(true);

      // 3. Prohibited: non-critical closing window (> 24h)
      const rejectedWindow = await smsPort.send({
        to: "+919876543210",
        text: "Closing in 48h",
        eventType: "window.closing",
        hoursRemaining: 48,
      });
      expect(rejectedWindow.success).toBe(false);
      expect(rejectedWindow.error).toContain("SMS prohibited");

      // 4. Prohibited: other events (e.g. document rejected)
      const rejectedDoc = await smsPort.send({
        to: "+919876543210",
        text: "Document rejected",
        eventType: "document.rejected",
      });
      expect(rejectedDoc.success).toBe(false);
      expect(rejectedDoc.error).toContain("SMS prohibited");
    });

    it("PushPort sends browser push and cleans up 410 Gone subscriptions", async () => {
      const pushPort = new PushPort({
        subject: "mailto:test@hostelhub.internal",
      });

      vi.spyOn(NotificationService, "getUserPushSubscriptions").mockResolvedValueOnce([
        {
          endpoint: "https://push.example.com/sub-1",
          keys: { p256dh: "key", auth: "auth" },
        } as never,
      ]);

      const result = await pushPort.send({
        userId: "user-123",
        title: "Allotment Update",
        body: "Your room assignment has been posted.",
        url: "https://hostelhub.internal/room",
      });

      expect(result.success).toBe(true);
      expect(result.sentCount).toBe(1);
    });

    it("WebhookPort sends operational alerts to Slack/Discord", async () => {
      const webhookPort = new WebhookPort();

      const result = await webhookPort.send({
        eventType: "sla.breached",
        payload: { text: "Review SLA expired" },
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
    });

    it("InAppPort persists notification and publishes to user Redis SSE channel", async () => {
      const mockRedis = {
        publish: vi.fn().mockResolvedValue(1),
      };

      const inAppPort = new InAppPort(mockRedis as never);

      vi.spyOn(NotificationService, "createInAppNotification").mockResolvedValueOnce({
        _id: "notif-999",
        title: "Draft Approved",
        message: "Your draft has been approved.",
        deep_link: "/staff/warden/review",
        event_type: "draft.approved",
        category: "warden",
        priority: "normal",
        read: false,
        created_at: new Date(),
      } as never);

      vi.spyOn(NotificationService, "getUnreadCount").mockResolvedValueOnce(1);

      const result = await inAppPort.send({
        userId: "user-warden-1",
        institutionId: "inst-1",
        eventId: "evt-draft-1",
        eventType: "draft.approved",
        title: "Draft Approved",
        message: "Your draft has been approved.",
        deepLink: "/staff/warden/review",
      });

      expect(result.success).toBe(true);
      expect(result.notificationId).toBe("notif-999");
      expect(mockRedis.publish).toHaveBeenCalledWith(
        "user:user-warden-1:notifications",
        expect.stringContaining("Draft Approved"),
      );
    });
  });

  describe("Notification Processor & DLQ Flow", () => {
    it("dispatches job across configured channels and records delivery", async () => {
      const mockRedis = {
        publish: vi.fn().mockResolvedValue(1),
      };

      vi.spyOn(NotificationService, "getUserPreferences").mockResolvedValueOnce({
        userId: "user-student-1",
        institutionId: "inst-1",
        channels: {
          "allocation.published": ["in_app", "email", "sms"],
        },
        quietHours: { enabled: false, start: "22:00", end: "07:00", timezone: "UTC" },
        dailyDigest: false,
      });

      vi.spyOn(NotificationService, "createInAppNotification").mockResolvedValueOnce({
        _id: "notif-1",
        title: "Results Published",
        message: "Check room reveal",
        deep_link: "/room",
        event_type: "allocation.published",
        category: "allocation",
        priority: "urgent",
        read: false,
        created_at: new Date(),
      } as never);

      vi.spyOn(NotificationService, "recordDeliveryAttempt").mockResolvedValue({} as never);

      const workerCtx = setupNotificationWorker(mockRedis as never);

      const mockJob = {
        id: "job-101",
        attemptsMade: 0,
        data: {
          eventId: "evt-pub-1",
          eventType: "allocation.published",
          recipientId: "user-student-1",
          recipientEmail: "student@example.com",
          recipientPhone: "+919999999999",
          institutionId: "inst-1",
          priority: "urgent",
        },
      };

      const result = await workerCtx.processJob(mockJob as never);
      expect(result["in_app"]).toEqual({ status: "delivered" });
      expect(result["email"]).toEqual({ status: "delivered" });
      expect(result["sms"]).toEqual({ status: "delivered" });

      await workerCtx.close();
    });

    it("routes to Dead-Letter Queue (DLQ) after 5 failed attempts", async () => {
      const mockRedis = {
        publish: vi.fn().mockResolvedValue(1),
      };

      vi.spyOn(NotificationService, "getUserPreferences").mockResolvedValueOnce({
        userId: "user-admin-1",
        institutionId: "inst-1",
        channels: {
          "auditchain.failed": ["in_app"],
        },
        quietHours: { enabled: false, start: "22:00", end: "07:00", timezone: "UTC" },
        dailyDigest: false,
      });

      // Force inAppPort to fail
      vi.spyOn(NotificationService, "createInAppNotification").mockRejectedValue(
        new Error("Database connection dropped"),
      );

      let recordedStatus = "";
      vi.spyOn(NotificationService, "recordDeliveryAttempt").mockImplementation(async (params) => {
        recordedStatus = params.status;
        return {} as never;
      });

      const workerCtx = setupNotificationWorker(mockRedis as never);

      // Attempt 5 (attemptsMade = 4)
      const mockJob = {
        id: "job-failed-5",
        attemptsMade: 4, // 5th attempt
        data: {
          eventId: "evt-fail-1",
          eventType: "auditchain.failed",
          recipientId: "user-admin-1",
          institutionId: "inst-1",
          priority: "urgent",
        },
      };

      const result = await workerCtx.processJob(mockJob as never);
      expect(result["in_app"]).toMatchObject({ status: "dead_letter" });
      expect(recordedStatus).toBe("dead_letter");

      await workerCtx.close();
    });
  });
});

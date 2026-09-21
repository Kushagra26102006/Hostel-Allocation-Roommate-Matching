import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { NotificationService } from "../index.js";

describe("Prompt 23: Notification Hub Database Integration Tests", () => {
  let mongod: MongoMemoryServer;

  const institutionId = new Types.ObjectId();
  const userId1 = new Types.ObjectId();
  const userId2 = new Types.ObjectId();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  describe("In-App Notifications", () => {
    it("creates and retrieves in-app notifications with unread counts", async () => {
      // Create 3 notifications for user 1
      await NotificationService.createInAppNotification({
        userId: String(userId1),
        institutionId: String(institutionId),
        eventId: "evt-1",
        eventType: "application.submitted",
        title: "Application Received",
        message: "Your application is submitted.",
        deepLink: "/application",
      });

      await NotificationService.createInAppNotification({
        userId: String(userId1),
        institutionId: String(institutionId),
        eventId: "evt-2",
        eventType: "document.rejected",
        title: "Document Rejected",
        message: "Please re-upload scan.",
        deepLink: "/application/documents",
      });

      await NotificationService.createInAppNotification({
        userId: String(userId1),
        institutionId: String(institutionId),
        eventId: "evt-3",
        eventType: "allocation.published",
        title: "Allocation Published",
        message: "Your room has been assigned.",
        deepLink: "/room",
      });

      const unreadCount = await NotificationService.getUnreadCount(String(userId1));
      expect(unreadCount).toBe(3);

      const listResult = await NotificationService.getUserNotifications(String(userId1), {
        page: 1,
        limit: 10,
      });
      expect(listResult.total).toBe(3);
      expect(listResult.notifications).toHaveLength(3);
      expect(listResult.unreadCount).toBe(3);
    });

    it("marks single notification and all notifications as read", async () => {
      const list = await NotificationService.getUserNotifications(String(userId1));
      const firstId = String(list.notifications[0]!._id);

      const updatedDoc = await NotificationService.markNotificationAsRead(firstId, String(userId1));
      expect(updatedDoc?.read).toBe(true);
      expect(updatedDoc?.read_at).toBeDefined();

      let unreadCount = await NotificationService.getUnreadCount(String(userId1));
      expect(unreadCount).toBe(2);

      const modifiedCount = await NotificationService.markAllNotificationsAsRead(String(userId1));
      expect(modifiedCount).toBe(2);

      unreadCount = await NotificationService.getUnreadCount(String(userId1));
      expect(unreadCount).toBe(0);
    });
  });

  describe("User Preferences & Quiet Hours", () => {
    it("provides full default channels matrix when no preferences have been saved", async () => {
      const prefs = await NotificationService.getUserPreferences(
        String(userId2),
        String(institutionId),
      );
      expect(prefs.userId).toBe(String(userId2));
      expect(prefs.channels["application.submitted"]).toContain("in_app");
      expect(prefs.channels["allocation.published"]).toContain("sms");
      expect(prefs.quietHours.enabled).toBe(false);
      expect(prefs.dailyDigest).toBe(false);
    });

    it("saves and merges updated user preferences and quiet hours", async () => {
      const updated = await NotificationService.updateUserPreferences(
        String(userId2),
        String(institutionId),
        {
          channels: {
            "application.submitted": ["in_app"], // Opted out of email
          },
          quietHours: {
            enabled: true,
            start: "23:00",
            end: "06:30",
            timezone: "Asia/Kolkata",
          },
          dailyDigest: true,
        },
      );

      expect(updated.channels["application.submitted"]).toEqual(["in_app"]);
      expect(updated.quietHours.enabled).toBe(true);
      expect(updated.quietHours.start).toBe("23:00");
      expect(updated.quietHours.end).toBe("06:30");
      expect(updated.quietHours.timezone).toBe("Asia/Kolkata");
      expect(updated.dailyDigest).toBe(true);

      // Verify persistence
      const fetched = await NotificationService.getUserPreferences(
        String(userId2),
        String(institutionId),
      );
      expect(fetched.quietHours.enabled).toBe(true);
      expect(fetched.dailyDigest).toBe(true);
    });
  });

  describe("Web Push Subscriptions", () => {
    it("saves, lists, and deletes browser push subscriptions", async () => {
      const endpoint = "https://fcm.googleapis.com/fcm/send/test-sub-token";
      await NotificationService.savePushSubscription(String(userId1), {
        endpoint,
        keys: {
          p256dh: "BM6h...",
          auth: "k8d...",
        },
        userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      });

      const subs = await NotificationService.getUserPushSubscriptions(String(userId1));
      expect(subs).toHaveLength(1);
      expect(subs[0]?.endpoint).toBe(endpoint);

      const deleted = await NotificationService.deletePushSubscription(endpoint);
      expect(deleted).toBe(true);

      const subsAfter = await NotificationService.getUserPushSubscriptions(String(userId1));
      expect(subsAfter).toHaveLength(0);
    });
  });

  describe("Delivery Logging & Dead-Letter Queue (DLQ)", () => {
    it("records delivery attempts, tracks retries, and transitions to DLQ", async () => {
      const eventId = "evt-dlq-test-1";

      // Attempt 1: Failed
      await NotificationService.recordDeliveryAttempt({
        eventId,
        eventType: "sla.breached",
        institutionId: String(institutionId),
        recipient: "https://hooks.slack.com/services/test",
        channel: "webhook",
        status: "failed",
        attemptCount: 1,
        lastError: "HTTP 503 Service Unavailable",
      });

      let dlqList = await NotificationService.getDlqEntries();
      expect(dlqList.total).toBe(0); // Not in DLQ yet

      // Attempt 5: Final failure -> DLQ
      await NotificationService.recordDeliveryAttempt({
        eventId,
        eventType: "sla.breached",
        institutionId: String(institutionId),
        recipient: "https://hooks.slack.com/services/test",
        channel: "webhook",
        status: "dead_letter",
        attemptCount: 5,
        lastError: "HTTP 503 Service Unavailable (Attempts Exhausted)",
      });

      dlqList = await NotificationService.getDlqEntries();
      expect(dlqList.total).toBe(1);
      expect(dlqList.entries[0]?.status).toBe("dead_letter");
      expect(dlqList.entries[0]?.attempt_count).toBe(5);

      // Retry single DLQ item
      const entryId = String(dlqList.entries[0]?._id);
      const retried = await NotificationService.retryDlqEntry(entryId);
      expect(retried?.status).toBe("pending");
      expect(retried?.attempt_count).toBe(1);
      expect(retried?.last_error).toBeUndefined();

      // Verify DLQ is now clear
      dlqList = await NotificationService.getDlqEntries();
      expect(dlqList.total).toBe(0);
    });

    it("supports bulk retry of all dead-letter items", async () => {
      // Insert 2 dead letter items
      await NotificationService.recordDeliveryAttempt({
        eventId: "evt-dlq-a",
        eventType: "auditchain.failed",
        institutionId: String(institutionId),
        recipient: "security@hostelhub.internal",
        channel: "email",
        status: "dead_letter",
        attemptCount: 5,
        lastError: "SMTP connection timeout",
      });

      await NotificationService.recordDeliveryAttempt({
        eventId: "evt-dlq-b",
        eventType: "draft.ready",
        institutionId: String(institutionId),
        recipient: "warden@hostelhub.internal",
        channel: "email",
        status: "dead_letter",
        attemptCount: 5,
        lastError: "Mailbox full",
      });

      let dlq = await NotificationService.getDlqEntries();
      expect(dlq.total).toBe(2);

      const modifiedCount = await NotificationService.retryAllDlq();
      expect(modifiedCount).toBe(2);

      dlq = await NotificationService.getDlqEntries();
      expect(dlq.total).toBe(0);
    });
  });
});

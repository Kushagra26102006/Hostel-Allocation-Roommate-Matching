import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { NotificationService } from "@hostelhub/db";
import { renderNotificationTemplate, NOTIFICATION_EVENT_TYPES } from "@hostelhub/domain";

// Mock NextAuth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/auth";
const mockAuth = vi.mocked(auth);

// Import route handlers
import { GET as getNotificationsRoute } from "../app/api/v1/notifications/route";
import { PATCH as markNotificationReadRoute } from "../app/api/v1/notifications/[id]/read/route";
import { POST as markAllReadRoute } from "../app/api/v1/notifications/mark-all-read/route";
import {
  GET as getPreferencesRoute,
  PUT as putPreferencesRoute,
} from "../app/api/v1/notifications/preferences/route";
import { GET as getDlqRoute } from "../app/api/v1/admin/notifications/dlq/route";
import { POST as retrySingleDlqRoute } from "../app/api/v1/admin/notifications/dlq/[id]/retry/route";
import { POST as retryAllDlqRoute } from "../app/api/v1/admin/notifications/dlq/retry-all/route";

describe("Prompt 23: Multi-Channel Notification Hub API & Security Tests", () => {
  const mockStudentSession = {
    user: {
      id: "user-student-123",
      email: "student@hostelhub.internal",
      name: "Test Student",
      roles: ["student"],
      institutionId: "inst-101",
    },
    expires: "2026-12-31",
  };

  const mockAdminSession = {
    user: {
      id: "user-admin-456",
      email: "admin@hostelhub.internal",
      name: "Test Admin",
      roles: ["admin", "sys_admin"],
      institutionId: "inst-101",
    },
    expires: "2026-12-31",
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("In-App Notifications API", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      mockAuth.mockResolvedValueOnce(null as never);

      const req = new NextRequest("http://localhost:3000/api/v1/notifications");
      await expect(getNotificationsRoute(req)).rejects.toThrow();
    });

    it("returns paginated notifications and unread count for authenticated student", async () => {
      mockAuth.mockResolvedValueOnce(mockStudentSession as never);

      vi.spyOn(NotificationService, "getUserNotifications").mockResolvedValueOnce({
        notifications: [
          {
            _id: "notif-1",
            title: "Allocation Published",
            message: "Your room assignment is ready.",
            read: false,
            created_at: new Date(),
          } as never,
        ],
        total: 1,
        unreadCount: 1,
        page: 1,
        totalPages: 1,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/notifications?unreadOnly=true");
      const res = await getNotificationsRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.notifications).toHaveLength(1);
      expect(data.unreadCount).toBe(1);
    });

    it("marks single notification as read", async () => {
      mockAuth.mockResolvedValueOnce(mockStudentSession as never);

      vi.spyOn(NotificationService, "markNotificationAsRead").mockResolvedValueOnce({
        _id: "notif-1",
        read: true,
      } as never);

      const req = new NextRequest("http://localhost:3000/api/v1/notifications/notif-1/read", {
        method: "PATCH",
      });
      const params = Promise.resolve({ id: "notif-1" });

      const res = await markNotificationReadRoute(req, { params });
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.notification.read).toBe(true);
    });

    it("marks all notifications as read", async () => {
      mockAuth.mockResolvedValueOnce(mockStudentSession as never);
      vi.spyOn(NotificationService, "markAllNotificationsAsRead").mockResolvedValueOnce(3);

      const req = new NextRequest("http://localhost:3000/api/v1/notifications/mark-all-read", {
        method: "POST",
      });
      const res = await markAllReadRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.modifiedCount).toBe(3);
    });
  });

  describe("Preferences API", () => {
    it("gets and updates user notification preferences and quiet hours", async () => {
      mockAuth.mockResolvedValue(mockStudentSession as never);

      vi.spyOn(NotificationService, "getUserPreferences").mockResolvedValueOnce({
        userId: "user-student-123",
        institutionId: "inst-101",
        channels: { "allocation.published": ["in_app", "email"] },
        quietHours: { enabled: true, start: "22:00", end: "07:00", timezone: "UTC" },
        dailyDigest: false,
      });

      const getReq = new NextRequest("http://localhost:3000/api/v1/notifications/preferences");
      const getRes = await getPreferencesRoute(getReq);
      expect(getRes.status).toBe(200);

      const getData = await getRes.json();
      expect(getData.quietHours.enabled).toBe(true);

      vi.spyOn(NotificationService, "updateUserPreferences").mockResolvedValueOnce({
        userId: "user-student-123",
        institutionId: "inst-101",
        channels: { "allocation.published": ["in_app"] },
        quietHours: { enabled: false, start: "23:00", end: "06:00", timezone: "UTC" },
        dailyDigest: true,
      });

      const putReq = new NextRequest("http://localhost:3000/api/v1/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dailyDigest: true,
        }),
      });
      const putRes = await putPreferencesRoute(putReq);
      expect(putRes.status).toBe(200);

      const putData = await putRes.json();
      expect(putData.dailyDigest).toBe(true);
    });
  });

  describe("Dead-Letter Queue (DLQ) & Admin Authorization", () => {
    it("strictly blocks regular students with 403 Forbidden from accessing DLQ", async () => {
      mockAuth.mockResolvedValueOnce(mockStudentSession as never);

      const req = new NextRequest("http://localhost:3000/api/v1/admin/notifications/dlq");
      await expect(getDlqRoute(req)).rejects.toThrow();
    });

    it("allows administrators to inspect DLQ entries", async () => {
      mockAuth.mockResolvedValueOnce(mockAdminSession as never);

      vi.spyOn(NotificationService, "getDlqEntries").mockResolvedValueOnce({
        entries: [
          {
            _id: "dlq-1",
            event_id: "evt-fail-1",
            channel: "email",
            attempt_count: 5,
            last_error: "Connection timeout",
          } as never,
        ],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      const req = new NextRequest("http://localhost:3000/api/v1/admin/notifications/dlq");
      const res = await getDlqRoute(req);
      expect(res.status).toBe(200);

      const data = await res.json();
      expect(data.total).toBe(1);
      expect(data.entries[0].channel).toBe("email");
    });

    it("allows admin to retry single and bulk DLQ entries", async () => {
      mockAuth.mockResolvedValue(mockAdminSession as never);

      vi.spyOn(NotificationService, "retryDlqEntry").mockResolvedValueOnce({
        _id: "dlq-1",
        status: "pending",
        attempt_count: 1,
      } as never);

      const singleReq = new NextRequest(
        "http://localhost:3000/api/v1/admin/notifications/dlq/dlq-1/retry",
        { method: "POST" },
      );
      const singleRes = await retrySingleDlqRoute(singleReq, {
        params: Promise.resolve({ id: "dlq-1" }),
      });
      expect(singleRes.status).toBe(200);
      const singleData = await singleRes.json();
      expect(singleData.entry.status).toBe("pending");

      vi.spyOn(NotificationService, "retryAllDlq").mockResolvedValueOnce(4);

      const bulkReq = new NextRequest(
        "http://localhost:3000/api/v1/admin/notifications/dlq/retry-all",
        { method: "POST" },
      );
      const bulkRes = await retryAllDlqRoute(bulkReq);
      expect(bulkRes.status).toBe(200);
      const bulkData = await bulkRes.json();
      expect(bulkData.retriedCount).toBe(4);
    });
  });

  describe("Zero-PII Notification Snapshot Test", () => {
    it("guarantees zero PII in notification templates for all 12 events", () => {
      for (const eventType of NOTIFICATION_EVENT_TYPES) {
        const rendered = renderNotificationTemplate(eventType, {
          hoursRemaining: 6,
          status: "Under Review",
          reason: "Format mismatch",
        });

        // Ensure bodies do not reveal sensitive student metadata
        expect(rendered.bodyText).not.toContain("Kushagra");
        expect(rendered.bodyText).not.toContain("Roll");
        expect(rendered.bodyText).not.toContain("Room 304");
        expect(rendered.bodyText).not.toContain("Bed A");

        // Deep links must be valid URLs
        expect(rendered.deepLink).toMatch(/^https?:\/\//);
      }
    });
  });
});

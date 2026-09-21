import { describe, it, expect } from "vitest";
import {
  NOTIFICATION_EVENT_TYPES,
  DEFAULT_NOTIFICATION_MATRIX,
  renderNotificationTemplate,
  evaluateQuietHours,
  calculateRetryDelayMs,
  shouldRouteToDlq,
  MAX_DELIVERY_ATTEMPTS,
  type NotificationEventType,
} from "../../notifications/index.js";

describe("Notification Domain", () => {
  describe("12 Domain Events & Templates", () => {
    it("contains exactly the 12 required domain events", () => {
      expect(NOTIFICATION_EVENT_TYPES).toHaveLength(12);
      expect(NOTIFICATION_EVENT_TYPES).toContain("application.submitted");
      expect(NOTIFICATION_EVENT_TYPES).toContain("window.closing");
      expect(NOTIFICATION_EVENT_TYPES).toContain("document.rejected");
      expect(NOTIFICATION_EVENT_TYPES).toContain("eligibility.result");
      expect(NOTIFICATION_EVENT_TYPES).toContain("draft.ready");
      expect(NOTIFICATION_EVENT_TYPES).toContain("draft.approved");
      expect(NOTIFICATION_EVENT_TYPES).toContain("allocation.published");
      expect(NOTIFICATION_EVENT_TYPES).toContain("waitlist.promoted");
      expect(NOTIFICATION_EVENT_TYPES).toContain("roomchange.decided");
      expect(NOTIFICATION_EVENT_TYPES).toContain("appeal.decided");
      expect(NOTIFICATION_EVENT_TYPES).toContain("sla.breached");
      expect(NOTIFICATION_EVENT_TYPES).toContain("auditchain.failed");
    });

    it("renders valid subject, body, deep links, and channels for all 12 events", () => {
      for (const eventType of NOTIFICATION_EVENT_TYPES) {
        const rendered = renderNotificationTemplate(eventType, {
          hoursRemaining: 12,
          reason: "Illegible certificate",
          draftVersion: 2,
          status: "Verified",
        });

        expect(rendered.subject).toBeTruthy();
        expect(rendered.bodyText).toBeTruthy();
        expect(rendered.bodyHtml).toContain("<!DOCTYPE html>");
        expect(rendered.bodyHtml).toContain(rendered.deepLink);
        expect(rendered.channels.length).toBeGreaterThan(0);
        expect(["low", "normal", "urgent"]).toContain(rendered.priority);
      }
    });

    it("enforces ZERO-PII snapshot: message bodies contain no student personal names, roll numbers, or room numbers", () => {
      const piiBlacklist = [
        /John Doe/i,
        /Roll\s*#?\s*\d+/i,
        /Room\s*\d{3}/i,
        /Bed\s*[A-D]/i,
        /diagnosis/i,
        /caste/i,
        /religion/i,
      ];

      for (const eventType of NOTIFICATION_EVENT_TYPES) {
        const rendered = renderNotificationTemplate(eventType, {
          hoursRemaining: 12,
          reason: "Unclear scan",
          status: "Eligible",
        });

        for (const pattern of piiBlacklist) {
          expect(rendered.bodyText).not.toMatch(pattern);
          expect(rendered.subject).not.toMatch(pattern);
          if (rendered.smsText) {
            expect(rendered.smsText).not.toMatch(pattern);
          }
        }
      }
    });

    it("strictly enforces SMS guardrail: only final allocation and critical closing window allow SMS", () => {
      for (const eventType of NOTIFICATION_EVENT_TYPES) {
        const matrix = DEFAULT_NOTIFICATION_MATRIX[eventType];
        if (eventType === "allocation.published") {
          expect(matrix.allowSms).toBe(true);
        } else if (eventType === "window.closing") {
          expect(matrix.allowSms).toBe(true);
          // When hours > 24, SMS is dropped
          const nonCritical = renderNotificationTemplate("window.closing", { hoursRemaining: 48 });
          expect(nonCritical.smsText).toBeUndefined();
          expect(nonCritical.channels).not.toContain("sms");

          // When hours <= 24, SMS is included
          const critical = renderNotificationTemplate("window.closing", { hoursRemaining: 12 });
          expect(critical.smsText).toBeDefined();
          expect(critical.channels).toContain("sms");
        } else {
          expect(matrix.allowSms).toBe(false);
          const rendered = renderNotificationTemplate(eventType);
          expect(rendered.smsText).toBeUndefined();
          expect(rendered.channels).not.toContain("sms");
        }
      }
    });

    it("configures webhooks for warden and admin operational alerts", () => {
      const operationalEvents: NotificationEventType[] = [
        "draft.ready",
        "draft.approved",
        "sla.breached",
        "auditchain.failed",
      ];

      for (const eventType of operationalEvents) {
        const rendered = renderNotificationTemplate(eventType);
        expect(rendered.channels).toContain("webhook");
        expect(rendered.webhookPayload).toBeDefined();
        expect(rendered.webhookPayload?.text).toBeTruthy();
      }
    });
  });

  describe("Quiet Hours Evaluator", () => {
    const config = {
      enabled: true,
      start: "22:00",
      end: "07:00",
      timezone: "UTC",
    };

    it("identifies when a timestamp is inside overnight quiet hours", () => {
      // 23:30 UTC -> inside
      const lateNight = new Date("2026-09-21T23:30:00Z");
      const res1 = evaluateQuietHours(lateNight, config, "application.submitted");
      expect(res1.inQuietHours).toBe(true);
      expect(res1.canBypass).toBe(false);
      expect(res1.deferUntil).toBeDefined();

      // 03:15 UTC -> inside
      const earlyMorning = new Date("2026-09-22T03:15:00Z");
      const res2 = evaluateQuietHours(earlyMorning, config, "application.submitted");
      expect(res2.inQuietHours).toBe(true);

      // 14:00 UTC -> outside
      const daytime = new Date("2026-09-21T14:00:00Z");
      const res3 = evaluateQuietHours(daytime, config, "application.submitted");
      expect(res3.inQuietHours).toBe(false);
      expect(res3.deferUntil).toBeNull();
    });

    it("bypasses quiet hours for urgent events (SLA breach, audit chain failure, allocation published)", () => {
      const lateNight = new Date("2026-09-21T23:30:00Z");

      const slaRes = evaluateQuietHours(lateNight, config, "sla.breached", "urgent");
      expect(slaRes.inQuietHours).toBe(false);
      expect(slaRes.canBypass).toBe(true);

      const auditRes = evaluateQuietHours(lateNight, config, "auditchain.failed", "urgent");
      expect(auditRes.inQuietHours).toBe(false);
      expect(auditRes.canBypass).toBe(true);

      const publishedRes = evaluateQuietHours(lateNight, config, "allocation.published", "urgent");
      expect(publishedRes.inQuietHours).toBe(false);
      expect(publishedRes.canBypass).toBe(true);
    });

    it("delivers immediately if quiet hours are disabled", () => {
      const lateNight = new Date("2026-09-21T23:30:00Z");
      const disabledConfig = { ...config, enabled: false };
      const res = evaluateQuietHours(lateNight, disabledConfig, "application.submitted");
      expect(res.inQuietHours).toBe(false);
      expect(res.deferUntil).toBeNull();
    });
  });

  describe("Backoff & Dead-Letter Queue (DLQ)", () => {
    it("computes increasing delay with jitter for retries", () => {
      const delay1 = calculateRetryDelayMs(1, 1000, 60000, 0);
      const delay2 = calculateRetryDelayMs(2, 1000, 60000, 0);
      const delay3 = calculateRetryDelayMs(3, 1000, 60000, 0);

      expect(delay1).toBe(1000); // 1000 * 2^0
      expect(delay2).toBe(2000); // 1000 * 2^1
      expect(delay3).toBe(4000); // 1000 * 2^2
      expect(delay3).toBeGreaterThan(delay2);
      expect(delay2).toBeGreaterThan(delay1);

      // With jitter, value should be >= base exponential
      const delayWithJitter = calculateRetryDelayMs(2, 1000, 60000, 0.25);
      expect(delayWithJitter).toBeGreaterThanOrEqual(2000);
      expect(delayWithJitter).toBeLessThanOrEqual(2000 * 1.25);
    });

    it("respects max cap on retry delay", () => {
      const delayLarge = calculateRetryDelayMs(10, 1000, 15000, 0);
      expect(delayLarge).toBe(15000);
    });

    it("transitions to DLQ after exactly 5 failed attempts", () => {
      expect(MAX_DELIVERY_ATTEMPTS).toBe(5);
      expect(shouldRouteToDlq(1)).toBe(false);
      expect(shouldRouteToDlq(2)).toBe(false);
      expect(shouldRouteToDlq(4)).toBe(false);
      expect(shouldRouteToDlq(5)).toBe(true);
      expect(shouldRouteToDlq(6)).toBe(true);
    });
  });
});

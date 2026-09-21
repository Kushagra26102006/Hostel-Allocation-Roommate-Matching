/**
 * @hostelhub/domain — Notification Types
 * Defines the 12 core domain events, delivery channels, priority tiers,
 * user preferences, and delivery tracking interfaces.
 */

export const NOTIFICATION_EVENT_TYPES = [
  "application.submitted",
  "window.closing",
  "document.rejected",
  "eligibility.result",
  "draft.ready",
  "draft.approved",
  "allocation.published",
  "waitlist.promoted",
  "roomchange.decided",
  "appeal.decided",
  "sla.breached",
  "auditchain.failed",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export type NotificationChannel = "in_app" | "email" | "push" | "sms" | "webhook";

export type NotificationPriority = "low" | "normal" | "urgent";

export type DeliveryStatus = "pending" | "delivered" | "failed" | "dead_letter";

export interface NotificationEventPayload {
  eventId: string;
  eventType: NotificationEventType;
  recipientId: string;
  recipientEmail?: string | undefined;
  recipientPhone?: string | undefined;
  institutionId: string;
  priority?: NotificationPriority | undefined;
  data?: Record<string, unknown> | undefined;
  createdAt?: string | undefined;
}

export interface RenderedNotificationMessage {
  subject: string;
  bodyText: string;
  bodyHtml: string;
  deepLink: string;
  smsText?: string | undefined;
  webhookPayload?: Record<string, unknown> | undefined;
  channels: NotificationChannel[];
  priority: NotificationPriority;
}

export interface QuietHoursConfig {
  enabled: boolean;
  start: string; // "HH:MM", e.g. "22:00"
  end: string; // "HH:MM", e.g. "07:00"
  timezone: string; // e.g. "Asia/Kolkata" or "UTC"
}

export interface UserNotificationPreferences {
  userId: string;
  channels: Partial<Record<NotificationEventType, NotificationChannel[]>>;
  quietHours: QuietHoursConfig;
  dailyDigest: boolean;
}

export interface NotificationTemplateContext {
  institutionName?: string | undefined;
  actionUrl?: string | undefined;
  deadline?: string | undefined;
  status?: string | undefined;
  reason?: string | undefined;
  hoursRemaining?: number | undefined;
  draftVersion?: number | undefined;
  hostelName?: string | undefined;
  cycleName?: string | undefined;
  slaBreachType?: string | undefined;
  auditBlockHeight?: number | undefined;
}

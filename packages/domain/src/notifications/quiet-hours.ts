/**
 * @hostelhub/domain — Quiet Hours Evaluator
 * Pure function to determine if a notification falls within user quiet hours.
 * Handles overnight time windows (e.g. 22:00 to 07:00) and priority exemptions.
 */

import type { QuietHoursConfig, NotificationPriority, NotificationEventType } from "./types.js";

export interface QuietHoursEvaluation {
  inQuietHours: boolean;
  canBypass: boolean;
  deferUntil: Date | null;
}

const ALWAYS_EXEMPT_EVENTS: ReadonlySet<NotificationEventType> = new Set([
  "sla.breached",
  "auditchain.failed",
  "allocation.published",
]);

/**
 * Checks if current time is within user-configured quiet hours.
 */
export function evaluateQuietHours(
  now: Date,
  config: QuietHoursConfig | undefined,
  eventType: NotificationEventType,
  priority: NotificationPriority = "normal",
): QuietHoursEvaluation {
  // If quiet hours are disabled or config missing, deliver immediately
  if (!config || !config.enabled) {
    return { inQuietHours: false, canBypass: false, deferUntil: null };
  }

  // Critical events and urgent alerts bypass quiet hours
  if (priority === "urgent" || ALWAYS_EXEMPT_EVENTS.has(eventType)) {
    return { inQuietHours: false, canBypass: true, deferUntil: null };
  }

  const [startHour = 22, startMin = 0] = config.start.split(":").map(Number);
  const [endHour = 7, endMin = 0] = config.end.split(":").map(Number);

  // Time in minutes from midnight for current time
  // If timezone is supplied, compute in that timezone; otherwise use UTC/local hours
  let currentHours = now.getHours();
  let currentMinutes = now.getMinutes();

  if (config.timezone) {
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: config.timezone,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      });
      const parts = formatter.formatToParts(now);
      const h = parts.find((p) => p.type === "hour")?.value;
      const m = parts.find((p) => p.type === "minute")?.value;
      if (h !== undefined) currentHours = parseInt(h, 10);
      if (m !== undefined) currentMinutes = parseInt(m, 10);
    } catch {
      // Fallback to local time if timezone is invalid
    }
  }

  const currentTotalMins = currentHours * 60 + currentMinutes;
  const startTotalMins = startHour * 60 + startMin;
  const endTotalMins = endHour * 60 + endMin;

  let isQuiet = false;
  if (startTotalMins < endTotalMins) {
    // Single-day window (e.g. 13:00 to 15:00)
    isQuiet = currentTotalMins >= startTotalMins && currentTotalMins < endTotalMins;
  } else {
    // Overnight window (e.g. 22:00 to 07:00)
    isQuiet = currentTotalMins >= startTotalMins || currentTotalMins < endTotalMins;
  }

  if (!isQuiet) {
    return { inQuietHours: false, canBypass: false, deferUntil: null };
  }

  // Calculate deferUntil timestamp (next occurrence of end time)
  const deferUntil = new Date(now.getTime());
  deferUntil.setHours(endHour, endMin, 0, 0);
  if (deferUntil.getTime() <= now.getTime()) {
    deferUntil.setDate(deferUntil.getDate() + 1);
  }

  return {
    inQuietHours: true,
    canBypass: false,
    deferUntil,
  };
}

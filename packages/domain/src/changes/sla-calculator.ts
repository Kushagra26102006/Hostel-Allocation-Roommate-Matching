/**
 * @hostelhub/domain — changes/sla-calculator.ts
 *
 * Pure SLA functions for appeal deadline calculation.
 * Counts only working days (Mon–Fri), optionally skipping holidays.
 * No side effects, no I/O.
 */

import type { SlaConfig } from "./types.js";

/**
 * Adds the given number of working days to a start date,
 * skipping weekends (Saturday=6, Sunday=0) and optional holidays.
 *
 * @param submittedAtIso - ISO 8601 date string when the appeal was submitted
 * @param config - SLA configuration with working days count and optional holidays
 * @returns ISO 8601 date string for the SLA deadline (end of the last working day, 23:59:59)
 */
export function calculateSlaDueDate(submittedAtIso: string, config: SlaConfig): string {
  const submittedAt = new Date(submittedAtIso);
  const holidaySet = new Set(config.holidays ?? []);
  let daysAdded = 0;
  const current = new Date(submittedAt);

  while (daysAdded < config.workingDays) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    const dateStr = formatDateKey(current);

    // Skip weekends and holidays
    if (day !== 0 && day !== 6 && !holidaySet.has(dateStr)) {
      daysAdded++;
    }
  }

  // Set to end of day (23:59:59.999)
  current.setHours(23, 59, 59, 999);
  return current.toISOString();
}

/**
 * Checks whether the SLA deadline has been breached.
 *
 * @param slaDueAtIso - ISO 8601 deadline
 * @param nowIso - Current time as ISO 8601
 * @returns true if now is past the deadline
 */
export function isSlaBreach(slaDueAtIso: string, nowIso: string): boolean {
  return new Date(nowIso).getTime() > new Date(slaDueAtIso).getTime();
}

/**
 * Returns the number of working days remaining until the SLA deadline.
 * Returns 0 if already breached. Negative if past due.
 *
 * @param slaDueAtIso - ISO 8601 deadline
 * @param nowIso - Current time as ISO 8601
 * @param holidays - Optional list of holiday ISO date strings
 * @returns Number of working days remaining (negative if overdue)
 */
export function getWorkingDaysRemaining(
  slaDueAtIso: string,
  nowIso: string,
  holidays?: string[],
): number {
  const now = new Date(nowIso);
  const due = new Date(slaDueAtIso);
  const holidaySet = new Set(holidays ?? []);

  if (now.getTime() >= due.getTime()) {
    // Count working days overdue (negative)
    return -countWorkingDaysBetween(due, now, holidaySet);
  }

  return countWorkingDaysBetween(now, due, holidaySet);
}

/**
 * Counts working days between two dates (exclusive of start, inclusive of end date).
 */
function countWorkingDaysBetween(start: Date, end: Date, holidays: Set<string>): number {
  let count = 0;
  const current = new Date(start);

  while (current < end) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    const dateStr = formatDateKey(current);

    if (day !== 0 && day !== 6 && !holidays.has(dateStr)) {
      count++;
    }
  }

  return count;
}

/**
 * Formats a date as YYYY-MM-DD for holiday comparison.
 */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * @hostelhub/domain — reports/privacy-suppression.ts
 *
 * Privacy suppression rule:
 * Suppress groups with fewer than 5 people (1 <= N < 5) in any demographic or breakdown.
 * When suppressed, count is null, is_suppressed is true, and display_count is "< 5".
 */

import { PRIVACY_SUPPRESSION_THRESHOLD, type SuppressedCount } from "./types.js";

/**
 * Checks if a group size warrants privacy suppression.
 * Returns true if 1 <= count < 5. (0 is typically unpopulated and safe to show as 0,
 * but if strictThreshold is enabled, any count < 5 is suppressed).
 */
export function isSuppressedGroup(count: number): boolean {
  return count > 0 && count < PRIVACY_SUPPRESSION_THRESHOLD;
}

/**
 * Encapsulates a count with privacy suppression rules.
 */
export function applyPrivacySuppression(count: number): SuppressedCount {
  if (isSuppressedGroup(count)) {
    return {
      count: null,
      is_suppressed: true,
      display_value: "< 5",
    };
  }
  return {
    count,
    is_suppressed: false,
    display_value: count.toString(),
  };
}

/**
 * Formats a count or rate for display, handling suppression.
 */
export function formatSuppressedCount(count: number | null, isSuppressed: boolean): string {
  if (isSuppressed || count === null) {
    return "< 5";
  }
  return count.toString();
}

/**
 * Formats a percentage/rate (0..1 or 0..100), returning "—" or "< 5" if suppressed.
 */
export function formatSuppressedRate(
  rate: number | null,
  isSuppressed: boolean,
  asPercentage = true,
): string {
  if (isSuppressed || rate === null) {
    return "—";
  }
  const val = asPercentage && rate <= 1 ? rate * 100 : rate;
  return `${val.toFixed(1)}%`;
}

/**
 * Transforms an array of breakdown items, applying privacy suppression if item count < 5.
 */
export function sanitizeBreakdown<T extends { count: number }>(
  items: T[],
): Array<
  Omit<T, "count"> & { count: number | null; is_suppressed: boolean; display_count: string }
> {
  return items.map((item) => {
    const suppressed = isSuppressedGroup(item.count);
    return {
      ...item,
      count: suppressed ? null : item.count,
      is_suppressed: suppressed,
      display_count: suppressed ? "< 5" : item.count.toString(),
    };
  });
}

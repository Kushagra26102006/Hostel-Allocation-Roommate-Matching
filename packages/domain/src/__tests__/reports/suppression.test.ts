import { describe, it, expect } from "vitest";
import {
  isSuppressedGroup,
  applyPrivacySuppression,
  formatSuppressedCount,
  formatSuppressedRate,
  sanitizeBreakdown,
} from "../../reports/privacy-suppression.js";

describe("Privacy Suppression Rules (< 5 threshold)", () => {
  it("identifies groups smaller than 5 for suppression", () => {
    expect(isSuppressedGroup(1)).toBe(true);
    expect(isSuppressedGroup(2)).toBe(true);
    expect(isSuppressedGroup(3)).toBe(true);
    expect(isSuppressedGroup(4)).toBe(true);
  });

  it("does not suppress groups with 5 or more people", () => {
    expect(isSuppressedGroup(5)).toBe(false);
    expect(isSuppressedGroup(6)).toBe(false);
    expect(isSuppressedGroup(50)).toBe(false);
  });

  it("applies privacy suppression formatting to counts", () => {
    const suppressed = applyPrivacySuppression(3);
    expect(suppressed.is_suppressed).toBe(true);
    expect(suppressed.count).toBeNull();
    expect(suppressed.display_value).toBe("< 5");

    const unsuppressed = applyPrivacySuppression(8);
    expect(unsuppressed.is_suppressed).toBe(false);
    expect(unsuppressed.count).toBe(8);
    expect(unsuppressed.display_value).toBe("8");
  });

  it("formats suppressed counts and rates correctly", () => {
    expect(formatSuppressedCount(null, true)).toBe("< 5");
    expect(formatSuppressedCount(12, false)).toBe("12");

    expect(formatSuppressedRate(null, true)).toBe("—");
    expect(formatSuppressedRate(0.854, false)).toBe("85.4%");
  });

  it("sanitizes arrays of breakdown items", () => {
    const rawItems = [
      { category: "Single Room", count: 2 },
      { category: "Double Room", count: 15 },
      { category: "Triple Room", count: 4 },
      { category: "Quad Room", count: 32 },
    ];

    const sanitized = sanitizeBreakdown(rawItems);
    expect(sanitized).toEqual([
      { category: "Single Room", count: null, is_suppressed: true, display_count: "< 5" },
      { category: "Double Room", count: 15, is_suppressed: false, display_count: "15" },
      { category: "Triple Room", count: null, is_suppressed: true, display_count: "< 5" },
      { category: "Quad Room", count: 32, is_suppressed: false, display_count: "32" },
    ]);
  });
});

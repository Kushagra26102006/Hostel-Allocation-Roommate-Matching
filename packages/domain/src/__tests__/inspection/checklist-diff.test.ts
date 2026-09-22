import { describe, it, expect } from "vitest";
import {
  computeChecklistDiff,
  isConditionWorsened,
  DEFAULT_HOSTEL_CHECKLIST_TEMPLATE,
  type ChecklistItemRecord,
} from "../../inspection/index.js";

describe("Room Condition Checklist & Diffing", () => {
  it("provides standard default campus checklist items", () => {
    expect(DEFAULT_HOSTEL_CHECKLIST_TEMPLATE.length).toBeGreaterThanOrEqual(6);
    const itemIds = DEFAULT_HOSTEL_CHECKLIST_TEMPLATE.map((t) => t.id);
    expect(itemIds).toContain("bed_frame_mattress");
    expect(itemIds).toContain("study_table_chair");
    expect(itemIds).toContain("wardrobe_almirah");
    expect(itemIds).toContain("ceiling_fan_lights");
  });

  describe("isConditionWorsened", () => {
    it("correctly identifies worsened conditions", () => {
      expect(isConditionWorsened("good", "fair")).toBe(true);
      expect(isConditionWorsened("good", "damaged")).toBe(true);
      expect(isConditionWorsened("good", "missing")).toBe(true);
      expect(isConditionWorsened("fair", "damaged")).toBe(true);
      expect(isConditionWorsened("damaged", "missing")).toBe(true);
    });

    it("returns false if condition is same or improved", () => {
      expect(isConditionWorsened("good", "good")).toBe(false);
      expect(isConditionWorsened("fair", "fair")).toBe(false);
      expect(isConditionWorsened("damaged", "good")).toBe(false);
      expect(isConditionWorsened("missing", "fair")).toBe(false);
    });
  });

  describe("computeChecklistDiff", () => {
    it("reports zero discrepancies when check-in and check-out match", () => {
      const items: ChecklistItemRecord[] = [
        { itemId: "bed", label: "Bed Frame", category: "furniture", condition: "good" },
        { itemId: "table", label: "Study Table", category: "furniture", condition: "good" },
        { itemId: "fan", label: "Fan", category: "electrical", condition: "good" },
      ];

      const report = computeChecklistDiff(items, items);

      expect(report.totalItems).toBe(3);
      expect(report.unalteredItems).toBe(3);
      expect(report.worsenedItems).toBe(0);
      expect(report.hasDamageLiability).toBe(false);
      expect(report.differences).toHaveLength(0);
    });

    it("identifies damaged and missing items and assesses damage liability", () => {
      const checkIn: ChecklistItemRecord[] = [
        { itemId: "bed", label: "Bed Frame", category: "furniture", condition: "good" },
        { itemId: "table", label: "Study Table", category: "furniture", condition: "good" },
        { itemId: "fan", label: "Fan", category: "electrical", condition: "good" },
        { itemId: "almirah", label: "Almirah", category: "furniture", condition: "good" },
      ];

      const checkOut: ChecklistItemRecord[] = [
        { itemId: "bed", label: "Bed Frame", category: "furniture", condition: "good" },
        {
          itemId: "table",
          label: "Study Table",
          category: "furniture",
          condition: "damaged",
          notes: "Deep scratch on table top",
          photoUrl: "https://minio.campus.edu/table_scratch.jpg",
        },
        {
          itemId: "fan",
          label: "Fan",
          category: "electrical",
          condition: "fair",
          notes: "Regulator knob loose",
        },
        {
          itemId: "almirah",
          label: "Almirah",
          category: "furniture",
          condition: "missing",
          notes: "Key missing",
        },
      ];

      const report = computeChecklistDiff(checkIn, checkOut);

      expect(report.totalItems).toBe(4);
      expect(report.unalteredItems).toBe(1); // bed
      expect(report.worsenedItems).toBe(3); // table, fan, almirah
      expect(report.hasDamageLiability).toBe(true);
      expect(report.differences).toHaveLength(3);

      const tableDiff = report.differences.find((d) => d.itemId === "table")!;
      expect(tableDiff.checkInCondition).toBe("good");
      expect(tableDiff.checkOutCondition).toBe("damaged");
      expect(tableDiff.worsened).toBe(true);
      expect(tableDiff.liabilityAssessed).toBe(true);
      expect(tableDiff.checkOutNotes).toBe("Deep scratch on table top");

      const almirahDiff = report.differences.find((d) => d.itemId === "almirah")!;
      expect(almirahDiff.checkOutCondition).toBe("missing");
      expect(almirahDiff.liabilityAssessed).toBe(true);
    });

    it("flags note changes even when condition rating is unchanged", () => {
      const checkIn: ChecklistItemRecord[] = [
        {
          itemId: "window",
          label: "Window",
          category: "fixtures",
          condition: "good",
          notes: "Clean",
        },
      ];
      const checkOut: ChecklistItemRecord[] = [
        {
          itemId: "window",
          label: "Window",
          category: "fixtures",
          condition: "good",
          notes: "Dusty but intact",
        },
      ];

      const report = computeChecklistDiff(checkIn, checkOut);

      expect(report.totalItems).toBe(1);
      expect(report.unalteredItems).toBe(1);
      expect(report.worsenedItems).toBe(0);
      expect(report.hasDamageLiability).toBe(false);
      expect(report.differences).toHaveLength(1);
      expect(report.differences[0]!.checkInNotes).toBe("Clean");
      expect(report.differences[0]!.checkOutNotes).toBe("Dusty but intact");
    });
  });
});

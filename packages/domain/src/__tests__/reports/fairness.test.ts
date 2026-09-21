import { describe, it, expect } from "vitest";
import {
  calculateGini,
  calculateQuotaFairness,
  detectPriorityInversions,
  calculateCompatibilityStats,
  type AssignmentUnitFairnessInput,
} from "../../reports/fairness-calculator.js";

describe("Fairness Calculator", () => {
  describe("Gini Coefficient calculation", () => {
    it("returns 0 for empty or all-zero lists", () => {
      expect(calculateGini([])).toBe(0);
      expect(calculateGini([0, 0, 0])).toBe(0);
    });

    it("returns 0 for identical distribution (perfect equality)", () => {
      expect(calculateGini([100, 100, 100, 100])).toBe(0);
    });

    it("computes accurate Gini for unequal distributions", () => {
      // Known theoretical Gini for [1, 2, 3, 4, 5]:
      // sumNumerator = (2*1 - 6)*1 + (2*2 - 6)*2 + (2*3 - 6)*3 + (2*4 - 6)*4 + (2*5 - 6)*5
      // = (-4)*1 + (-2)*2 + 0 + 2*4 + 4*5 = -4 - 4 + 0 + 8 + 20 = 20
      // denominator = 5 * 15 = 75
      // Gini = 20 / 75 = 0.2667
      const g = calculateGini([1, 2, 3, 4, 5]);
      expect(g).toBeCloseTo(0.2667, 3);
    });

    it("yields high Gini for extreme inequality", () => {
      const g = calculateGini([0, 0, 0, 100]);
      expect(g).toBeGreaterThan(0.7);
    });
  });

  describe("Quota Fairness & Parity Gap", () => {
    it("computes first choice rates and category parity gap", () => {
      const units: AssignmentUnitFairnessInput[] = [
        // General: 5 units, 4 got 1st choice -> 80%
        {
          unitId: "g1",
          quotaBucket: "General",
          priorityTier: "P1",
          priorityScore: 90,
          rankSatisfied: 1,
          score: 85,
        },
        {
          unitId: "g2",
          quotaBucket: "General",
          priorityTier: "P1",
          priorityScore: 88,
          rankSatisfied: 1,
          score: 80,
        },
        {
          unitId: "g3",
          quotaBucket: "General",
          priorityTier: "P1",
          priorityScore: 85,
          rankSatisfied: 1,
          score: 82,
        },
        {
          unitId: "g4",
          quotaBucket: "General",
          priorityTier: "P2",
          priorityScore: 70,
          rankSatisfied: 1,
          score: 75,
        },
        {
          unitId: "g5",
          quotaBucket: "General",
          priorityTier: "P2",
          priorityScore: 65,
          rankSatisfied: 2,
          score: 60,
        },

        // OBC: 5 units, 3 got 1st choice -> 60%
        {
          unitId: "o1",
          quotaBucket: "OBC",
          priorityTier: "P1",
          priorityScore: 92,
          rankSatisfied: 1,
          score: 88,
        },
        {
          unitId: "o2",
          quotaBucket: "OBC",
          priorityTier: "P1",
          priorityScore: 89,
          rankSatisfied: 1,
          score: 84,
        },
        {
          unitId: "o3",
          quotaBucket: "OBC",
          priorityTier: "P2",
          priorityScore: 78,
          rankSatisfied: 1,
          score: 79,
        },
        {
          unitId: "o4",
          quotaBucket: "OBC",
          priorityTier: "P2",
          priorityScore: 72,
          rankSatisfied: 2,
          score: 65,
        },
        {
          unitId: "o5",
          quotaBucket: "OBC",
          priorityTier: "P3",
          priorityScore: 50,
          rankSatisfied: 3,
          score: 55,
        },
      ];

      const res = calculateQuotaFairness(units);
      expect(res.breakdown).toHaveLength(2);

      const general = res.breakdown.find((b) => b.category === "General")!;
      expect(general.count).toBe(5);
      expect(general.first_choice_rate).toBe(0.8);
      expect(general.is_suppressed).toBe(false);

      const obc = res.breakdown.find((b) => b.category === "OBC")!;
      expect(obc.count).toBe(5);
      expect(obc.first_choice_rate).toBe(0.6);
      expect(obc.is_suppressed).toBe(false);

      // Parity gap: 0.8 - 0.6 = 0.2
      expect(res.categoryParityGap).toBe(0.2);
      expect(res.overallFirstChoiceRate).toBe(0.7);
    });

    it("suppresses quota breakdown when category has fewer than 5 units", () => {
      const units: AssignmentUnitFairnessInput[] = [
        // ST: only 3 units (< 5 threshold)
        {
          unitId: "st1",
          quotaBucket: "ST",
          priorityTier: "P1",
          priorityScore: 90,
          rankSatisfied: 1,
          score: 85,
        },
        {
          unitId: "st2",
          quotaBucket: "ST",
          priorityTier: "P1",
          priorityScore: 80,
          rankSatisfied: 1,
          score: 80,
        },
        {
          unitId: "st3",
          quotaBucket: "ST",
          priorityTier: "P2",
          priorityScore: 70,
          rankSatisfied: 2,
          score: 60,
        },
      ];

      const res = calculateQuotaFairness(units);
      const st = res.breakdown.find((b) => b.category === "ST")!;
      expect(st.is_suppressed).toBe(true);
      expect(st.count).toBeNull();
      expect(st.first_choice_rate).toBeNull();
      expect(st.display_count).toBe("< 5");
    });
  });

  describe("Priority Inversion Detection", () => {
    it("returns 0 inversions when higher priority units always receive equal or better rank", () => {
      const units: AssignmentUnitFairnessInput[] = [
        {
          unitId: "u1",
          quotaBucket: "General",
          priorityTier: "P1",
          priorityScore: 95,
          rankSatisfied: 1,
          score: 90,
        },
        {
          unitId: "u2",
          quotaBucket: "General",
          priorityTier: "P1",
          priorityScore: 85,
          rankSatisfied: 1,
          score: 85,
        },
        {
          unitId: "u3",
          quotaBucket: "General",
          priorityTier: "P2",
          priorityScore: 75,
          rankSatisfied: 2,
          score: 70,
        },
        {
          unitId: "u4",
          quotaBucket: "General",
          priorityTier: "P3",
          priorityScore: 50,
          rankSatisfied: 3,
          score: 55,
        },
      ];

      const res = detectPriorityInversions(units);
      expect(res.count).toBe(0);
      expect(res.inversions).toHaveLength(0);
    });

    it("detects priority inversion when lower priority applicant gets better rank within same quota", () => {
      const units: AssignmentUnitFairnessInput[] = [
        // P1 got 2nd choice
        {
          unitId: "highPrio",
          quotaBucket: "General",
          priorityTier: "P1",
          priorityScore: 90,
          rankSatisfied: 2,
          score: 80,
        },
        // P2 got 1st choice (Inversion!)
        {
          unitId: "lowPrio",
          quotaBucket: "General",
          priorityTier: "P2",
          priorityScore: 60,
          rankSatisfied: 1,
          score: 90,
        },
      ];

      const res = detectPriorityInversions(units);
      expect(res.count).toBe(1);
      expect(res.inversions[0]).toEqual({
        higher_priority_unit_id: "highPrio",
        lower_priority_unit_id: "lowPrio",
        quota_bucket: "General",
        higher_priority_rank: 2,
        lower_priority_rank: 1,
      });
    });

    it("ignores differences across different quota buckets (quotas are isolated)", () => {
      const units: AssignmentUnitFairnessInput[] = [
        // P1 General got 2nd choice
        {
          unitId: "genP1",
          quotaBucket: "General",
          priorityTier: "P1",
          priorityScore: 90,
          rankSatisfied: 2,
          score: 80,
        },
        // P2 SC got 1st choice (different quota bucket, NOT an inversion)
        {
          unitId: "scP2",
          quotaBucket: "SC",
          priorityTier: "P2",
          priorityScore: 60,
          rankSatisfied: 1,
          score: 90,
        },
      ];

      const res = detectPriorityInversions(units);
      expect(res.count).toBe(0);
    });
  });

  describe("Compatibility Stats", () => {
    it("computes mean and minimum compatibility score", () => {
      const stats = calculateCompatibilityStats([0.9, 0.8, 0.95, 0.75]);
      expect(stats.minCompatibility).toBe(0.75);
      expect(stats.meanCompatibility).toBe(0.85);
    });

    it("handles empty arrays gracefully", () => {
      const stats = calculateCompatibilityStats([]);
      expect(stats.meanCompatibility).toBe(1.0);
      expect(stats.minCompatibility).toBe(1.0);
    });
  });
});

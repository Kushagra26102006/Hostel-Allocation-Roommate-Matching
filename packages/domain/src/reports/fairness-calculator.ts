/**
 * @hostelhub/domain — reports/fairness-calculator.ts
 *
 * Pure fairness calculation functions:
 * - Gini coefficient of preference scores
 * - First-choice rate by quota category
 * - Category parity gap
 * - Priority inversion detector (must be 0)
 * - Mean and minimum roommate compatibility
 */

import { isSuppressedGroup } from "./privacy-suppression.js";
import type { FairnessQuotaItem, PriorityInversionDetail } from "./types.js";

/**
 * Computes the Gini coefficient of an array of non-negative scores.
 * Formula: G = sum_{i=1}^n (2i - n - 1) * x_i / (n * sum_{i=1}^n x_i)
 * where x is sorted in ascending order.
 * Returns 0 if values is empty or all elements are 0.
 */
export function calculateGini(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let sumNumerator = 0;
  for (let i = 0; i < n; i++) {
    sumNumerator += (2 * (i + 1) - n - 1) * sorted[i]!;
  }
  const sumTotal = sorted.reduce((a, b) => a + b, 0);
  if (sumTotal === 0) return 0;
  const result = sumNumerator / (n * sumTotal);
  // Round to 4 decimal places, clamp to [0, 1]
  return Math.max(0, Math.min(1, Math.round(result * 10000) / 10000));
}

export interface AssignmentUnitFairnessInput {
  unitId: string;
  quotaBucket: string;
  priorityTier: string; // e.g. "P1", "P2", "P3"
  priorityScore: number;
  rankSatisfied: number | null; // 1 = 1st choice, 2 = 2nd choice, etc. null = waitlist/unassigned
  score: number;
}

/**
 * Computes the breakdown by quota category, first-choice rates, and parity gap.
 */
export function calculateQuotaFairness(units: AssignmentUnitFairnessInput[]): {
  breakdown: FairnessQuotaItem[];
  categoryParityGap: number;
  overallFirstChoiceRate: number;
} {
  const byCategory = new Map<string, { count: number; firstChoice: number; totalScore: number }>();

  let totalUnits = 0;
  let totalFirstChoice = 0;

  for (const u of units) {
    const b = u.quotaBucket || "General";
    const cur = byCategory.get(b) ?? { count: 0, firstChoice: 0, totalScore: 0 };
    cur.count++;
    cur.totalScore += u.score;
    if (u.rankSatisfied === 1) {
      cur.firstChoice++;
      totalFirstChoice++;
    }
    byCategory.set(b, cur);
    totalUnits++;
  }

  const breakdown: FairnessQuotaItem[] = [];
  const validRates: number[] = [];

  for (const [category, stats] of byCategory.entries()) {
    const suppressed = isSuppressedGroup(stats.count);
    const rate = stats.count > 0 ? stats.firstChoice / stats.count : 0;
    const avgScore = stats.count > 0 ? stats.totalScore / stats.count : 0;

    if (!suppressed && stats.count >= 5) {
      validRates.push(rate);
    }

    breakdown.push({
      category,
      count: suppressed ? null : stats.count,
      first_choice_count: suppressed ? null : stats.firstChoice,
      first_choice_rate: suppressed ? null : Math.round(rate * 1000) / 1000,
      avg_score: suppressed ? null : Math.round(avgScore * 10) / 10,
      is_suppressed: suppressed,
      display_count: suppressed ? "< 5" : stats.count.toString(),
    });
  }

  // Sort breakdown alphabetically by category
  breakdown.sort((a, b) => a.category.localeCompare(b.category));

  // Category parity gap: max rate - min rate across valid (unsuppressed) categories
  // If fewer than 2 unsuppressed categories, evaluate across all categories with count > 0
  let parityGap = 0;
  if (validRates.length >= 2) {
    parityGap = Math.max(...validRates) - Math.min(...validRates);
  } else if (byCategory.size >= 2) {
    const allRates = [...byCategory.values()].map((v) =>
      v.count > 0 ? v.firstChoice / v.count : 0,
    );
    parityGap = Math.max(...allRates) - Math.min(...allRates);
  }

  const overallFirstChoiceRate =
    totalUnits > 0 ? Math.round((totalFirstChoice / totalUnits) * 1000) / 1000 : 0;

  return {
    breakdown,
    categoryParityGap: Math.round(parityGap * 1000) / 1000,
    overallFirstChoiceRate,
  };
}

/**
 * Detects Priority Inversions within quota buckets:
 * A priority inversion occurs when unit A has strictly higher priority than unit B
 * in the SAME quota bucket, but unit B received a strictly better satisfaction rank
 * (e.g. unit B got choice 1 while unit A got choice 2, or unit B got a room while unit A got none).
 *
 * For a valid algorithm run, priority inversions MUST BE 0.
 */
export function detectPriorityInversions(units: AssignmentUnitFairnessInput[]): {
  count: number;
  inversions: PriorityInversionDetail[];
} {
  const inversions: PriorityInversionDetail[] = [];

  // Group units by quota bucket
  const byBucket = new Map<string, AssignmentUnitFairnessInput[]>();
  for (const u of units) {
    const b = u.quotaBucket || "General";
    const list = byBucket.get(b) ?? [];
    list.push(u);
    byBucket.set(b, list);
  }

  // Check pairs within each bucket
  for (const [bucket, bucketUnits] of byBucket.entries()) {
    for (let i = 0; i < bucketUnits.length; i++) {
      for (let j = 0; j < bucketUnits.length; j++) {
        if (i === j) continue;
        const uA = bucketUnits[i]!;
        const uB = bucketUnits[j]!;

        // Determine if A has strictly higher priority than B:
        // Priority tiers: "P1" < "P2" < "P3" (alphabetically earlier tier = higher priority)
        // Or if same tier, higher priorityScore
        const tierComparison = uA.priorityTier.localeCompare(uB.priorityTier);
        const aHasHigherTier = tierComparison < 0;
        const sameTier = tierComparison === 0;
        const aHasHigherScore = sameTier && uA.priorityScore > uB.priorityScore;

        const aHasStrictlyHigherPriority = aHasHigherTier || aHasHigherScore;

        if (aHasStrictlyHigherPriority) {
          // Check satisfaction rank: lower number is better (1 is 1st choice, etc.)
          // null means unassigned/waitlisted (considered worse than any rank, say rank Infinity)
          const rankA = uA.rankSatisfied ?? Number.POSITIVE_INFINITY;
          const rankB = uB.rankSatisfied ?? Number.POSITIVE_INFINITY;

          // If B got a strictly better rank than A (i.e. rankB < rankA):
          if (rankB < rankA) {
            inversions.push({
              higher_priority_unit_id: uA.unitId,
              lower_priority_unit_id: uB.unitId,
              quota_bucket: bucket,
              higher_priority_rank: rankA,
              lower_priority_rank: rankB,
            });
          }
        }
      }
    }
  }

  return {
    count: inversions.length,
    inversions,
  };
}

/**
 * Computes mean and minimum compatibility score for rooms.
 */
export function calculateCompatibilityStats(roomScores: number[]): {
  meanCompatibility: number;
  minCompatibility: number;
} {
  if (roomScores.length === 0) {
    return { meanCompatibility: 1.0, minCompatibility: 1.0 };
  }
  const total = roomScores.reduce((acc, val) => acc + val, 0);
  const mean = total / roomScores.length;
  const min = Math.min(...roomScores);
  return {
    meanCompatibility: Math.round(mean * 1000) / 1000,
    minCompatibility: Math.round(min * 1000) / 1000,
  };
}

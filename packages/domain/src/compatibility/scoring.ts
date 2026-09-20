import {
  ITEM_WEIGHTS,
  type QuestionnaireAnswers,
  type QuestionnaireItemKey,
} from "./types.js";

/**
 * Ordinal similarity calculation on a 1-5 scale.
 * Similarity = 1 - |a - b| / 4
 */
export function calculateOrdinalSimilarity(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.max(0, Math.min(1, 1 - diff / 4));
}

/**
 * Categorical similarity calculation.
 * 1 if equal, 0 if different.
 */
export function calculateCategoricalSimilarity(
  a: string | number,
  b: string | number,
): number {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase()
    ? 1
    : 0;
}

/**
 * Calculates geometric mean of two students' importance ratings for an item.
 * Pair Importance = sqrt(importanceA * importanceB)
 */
export function calculatePairImportance(impA = 2, impB = 2): number {
  const a = Math.max(1, Math.min(3, impA));
  const b = Math.max(1, Math.min(3, impB));
  return Math.sqrt(a * b);
}

/**
 * Pure function: calculates compatibility pair score (0-100) between two students.
 * Missing items for either student are left out of both sums.
 * Returns neutral value 50 if no shared items exist.
 */
export function pairScore(
  a: QuestionnaireAnswers,
  b: QuestionnaireAnswers,
): number {
  if (!a || !b) return 50;

  let weightedSimilaritySum = 0;
  let weightedImportanceSum = 0;

  const allKeys = Object.keys(ITEM_WEIGHTS) as QuestionnaireItemKey[];

  for (const key of allKeys) {
    const itemA = a[key];
    const itemB = b[key];

    // Missing for either student => skip item
    if (!itemA || !itemB || itemA.value === undefined || itemB.value === undefined) {
      continue;
    }

    const weight = ITEM_WEIGHTS[key] ?? 0.5;
    const importance = calculatePairImportance(itemA.importance, itemB.importance);

    let similarity = 0;
    if (typeof itemA.value === "number" && typeof itemB.value === "number") {
      similarity = calculateOrdinalSimilarity(itemA.value, itemB.value);
    } else {
      similarity = calculateCategoricalSimilarity(itemA.value, itemB.value);
    }

    const productWeight = weight * importance;
    weightedSimilaritySum += productWeight * similarity;
    weightedImportanceSum += productWeight;
  }

  if (weightedImportanceSum === 0) {
    return 50; // Neutral fallback
  }

  const score = 100 * (weightedSimilaritySum / weightedImportanceSum);
  return Math.max(0, Math.min(100, Math.round(score * 100) / 100));
}

/**
 * Pure function: calculates compatibility room score (0-100) for a room of occupants.
 * RoomScore = 0.7 * mean(pairScores) + 0.3 * min(pairScores)
 * An empty room or a single/unanswered student gives neutral 50.
 */
export function roomScore(occupants: QuestionnaireAnswers[]): number {
  if (!Array.isArray(occupants) || occupants.length <= 1) {
    return 50;
  }

  const pairScoresList: number[] = [];

  for (let i = 0; i < occupants.length; i++) {
    for (let j = i + 1; j < occupants.length; j++) {
      const pScore = pairScore(occupants[i]!, occupants[j]!);
      pairScoresList.push(pScore);
    }
  }

  if (pairScoresList.length === 0) {
    return 50;
  }

  const sum = pairScoresList.reduce((acc, curr) => acc + curr, 0);
  const meanScore = sum / pairScoresList.length;
  const minScore = Math.min(...pairScoresList);

  const finalScore = 0.7 * meanScore + 0.3 * minScore;
  return Math.max(0, Math.min(100, Math.round(finalScore * 100) / 100));
}

/**
 * Checks for deal-breaker conflicts between two students.
 * Only triggers when both students opted into dealBreaker === true for an item.
 */
export function dealBreakerConflict(
  a: QuestionnaireAnswers,
  b: QuestionnaireAnswers,
): boolean {
  if (!a || !b) return false;

  const keys = Object.keys(ITEM_WEIGHTS) as QuestionnaireItemKey[];

  for (const key of keys) {
    const itemA = a[key];
    const itemB = b[key];

    if (itemA?.dealBreaker && itemB?.dealBreaker) {
      if (typeof itemA.value === "number" && typeof itemB.value === "number") {
        if (Math.abs(itemA.value - itemB.value) >= 3) return true;
      } else {
        if (String(itemA.value).toLowerCase() !== String(itemB.value).toLowerCase()) {
          return true;
        }
      }
    }
  }

  return false;
}

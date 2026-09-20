import { describe, it, expect } from "vitest";
import {
  pairScore,
  roomScore,
  dealBreakerConflict,
} from "../compatibility/index.js";
import type { QuestionnaireAnswers, QuestionnaireItemKey } from "../compatibility/types.js";

describe("Compatibility Scoring Engine", () => {
  describe("pairScore", () => {
    it("returns 100 for identical answers across all items", () => {
      const answers: QuestionnaireAnswers = {
        sleep: { value: 3, importance: 2 },
        study: { value: 4, importance: 3 },
        tidiness: { value: 5, importance: 2 },
        noise: { value: 2, importance: 1 },
        guests: { value: 1, importance: 2 },
        temperature: { value: 3, importance: 3 },
        social: { value: 4, importance: 2 },
        sharing: { value: 2, importance: 1 },
        smoking: { value: "non_smoker", importance: 3, dealBreaker: true },
      };

      const score = pairScore(answers, answers);
      expect(score).toBe(100);
    });

    it("returns 0 for maximally opposite answers", () => {
      const studentA: QuestionnaireAnswers = {
        sleep: { value: 1, importance: 2 },
        study: { value: 1, importance: 2 },
        tidiness: { value: 1, importance: 2 },
        noise: { value: 1, importance: 2 },
        guests: { value: 1, importance: 2 },
        temperature: { value: 1, importance: 2 },
        social: { value: 1, importance: 2 },
        sharing: { value: 1, importance: 2 },
        smoking: { value: "smoker", importance: 2 },
      };

      const studentB: QuestionnaireAnswers = {
        sleep: { value: 5, importance: 2 },
        study: { value: 5, importance: 2 },
        tidiness: { value: 5, importance: 2 },
        noise: { value: 5, importance: 2 },
        guests: { value: 5, importance: 2 },
        temperature: { value: 5, importance: 2 },
        social: { value: 5, importance: 2 },
        sharing: { value: 5, importance: 2 },
        smoking: { value: "non_smoker", importance: 2 },
      };

      // Ordinal similarity for |1 - 5| = 1 - 4/4 = 0.
      // Categorical similarity for smoker vs non_smoker = 0.
      const score = pairScore(studentA, studentB);
      expect(score).toBe(0);
    });

    it("handles missing items by omitting them from sums", () => {
      const studentA: QuestionnaireAnswers = {
        sleep: { value: 5, importance: 2 },
        // study missing
      };
      const studentB: QuestionnaireAnswers = {
        sleep: { value: 5, importance: 2 },
        study: { value: 1, importance: 2 },
      };

      // Only sleep is common, and it matches perfectly -> 100
      expect(pairScore(studentA, studentB)).toBe(100);
    });

    it("returns neutral score 50 if no common items exist", () => {
      const studentA: QuestionnaireAnswers = {
        sleep: { value: 5, importance: 2 },
      };
      const studentB: QuestionnaireAnswers = {
        study: { value: 1, importance: 2 },
      };

      expect(pairScore(studentA, studentB)).toBe(50);
    });

    it("returns neutral score 50 when both answers are empty", () => {
      expect(pairScore({}, {})).toBe(50);
    });
  });

  describe("roomScore", () => {
    it("returns neutral score 50 for empty occupants list", () => {
      expect(roomScore([])).toBe(50);
    });

    it("returns neutral score 50 for a single occupant", () => {
      const occupant: QuestionnaireAnswers = { sleep: { value: 3, importance: 2 } };
      expect(roomScore([occupant])).toBe(50);
    });

    it("calculates 0.7 * mean + 0.3 * min for multiple occupants", () => {
      const answers1: QuestionnaireAnswers = { sleep: { value: 5, importance: 2 } };
      const answers2: QuestionnaireAnswers = { sleep: { value: 5, importance: 2 } }; // pair(1,2) = 100
      const answers3: QuestionnaireAnswers = { sleep: { value: 1, importance: 2 } }; // pair(1,3) = 0, pair(2,3) = 0

      // Pair scores: [100, 0, 0]
      // Mean = 100/3 = 33.3333
      // Min = 0
      // roomScore = 0.7 * (100/3) + 0.3 * 0 = 23.33 -> 23.33
      const expected = Math.round((0.7 * (100 / 3) + 0.3 * 0) * 100) / 100;
      expect(roomScore([answers1, answers2, answers3])).toBe(expected);
    });
  });

  describe("dealBreakerConflict", () => {
    it("returns true when both students opted into dealBreaker and have conflicting categorical answers", () => {
      const studentA: QuestionnaireAnswers = {
        smoking: { value: "smoker", importance: 3, dealBreaker: true },
      };
      const studentB: QuestionnaireAnswers = {
        smoking: { value: "non_smoker", importance: 3, dealBreaker: true },
      };

      expect(dealBreakerConflict(studentA, studentB)).toBe(true);
    });

    it("returns false if only one student opted into dealBreaker", () => {
      const studentA: QuestionnaireAnswers = {
        smoking: { value: "smoker", importance: 3, dealBreaker: true },
      };
      const studentB: QuestionnaireAnswers = {
        smoking: { value: "non_smoker", importance: 3, dealBreaker: false },
      };

      expect(dealBreakerConflict(studentA, studentB)).toBe(false);
    });

    it("returns false if both students have the same answer even if marked dealBreaker", () => {
      const studentA: QuestionnaireAnswers = {
        smoking: { value: "non_smoker", importance: 3, dealBreaker: true },
      };
      const studentB: QuestionnaireAnswers = {
        smoking: { value: "non_smoker", importance: 3, dealBreaker: true },
      };

      expect(dealBreakerConflict(studentA, studentB)).toBe(false);
    });
  });

  describe("Property Tests", () => {
    const generateRandomAnswers = (seed: number): QuestionnaireAnswers => {
      const result: QuestionnaireAnswers = {};
      const keys: QuestionnaireItemKey[] = ["sleep", "study", "tidiness", "noise", "guests", "temperature", "social", "sharing"];
      keys.forEach((key, idx) => {
        if ((seed + idx) % 3 !== 0) {
          const val = (((seed * 7 + idx * 3) % 5) + 1) as number;
          const imp = (((seed * 3 + idx) % 3) + 1) as number;
          result[key] = { value: val, importance: imp };
        }
      });
      return result;
    };

    it("Symmetry: pairScore(a, b) === pairScore(b, a)", () => {
      for (let i = 1; i <= 20; i++) {
        const a = generateRandomAnswers(i);
        const b = generateRandomAnswers(i * 13);
        expect(pairScore(a, b)).toBe(pairScore(b, a));
      }
    });

    it("Range: 0 <= pairScore(a, b) <= 100", () => {
      for (let i = 1; i <= 20; i++) {
        const a = generateRandomAnswers(i);
        const b = generateRandomAnswers(i * 17);
        const score = pairScore(a, b);
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      }
    });

    it("Identical answers give 100", () => {
      for (let i = 1; i <= 20; i++) {
        const a = generateRandomAnswers(i);
        if (Object.keys(a).length > 0) {
          expect(pairScore(a, a)).toBe(100);
        }
      }
    });

    it("Adding a missing answer never crashes", () => {
      const a = generateRandomAnswers(5);
      const b = generateRandomAnswers(10);

      expect(() => {
        const scoreBefore = pairScore(a, b);
        const aWithExtra: QuestionnaireAnswers = {
          ...a,
          smoking: { value: "non_smoker", importance: 2 },
        };
        const scoreAfter = pairScore(aWithExtra, b);
        expect(typeof scoreBefore).toBe("number");
        expect(typeof scoreAfter).toBe("number");
      }).not.toThrow();
    });
  });
});

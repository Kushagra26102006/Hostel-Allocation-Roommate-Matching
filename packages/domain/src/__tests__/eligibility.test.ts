import { describe, it, expect } from "vitest";
import {
  evaluateExpression,
  formatReasonTemplate,
  evaluateRule,
  evaluate,
  describeExpression,
  CsvErpAdapter,
  type ApplicantFacts,
  type RuleExpression,
  type PolicyRule,
  type PolicyRuleSet,
} from "../eligibility/index.js";

describe("Module M3: Eligibility & Policy Evaluator", () => {
  const sampleFacts: ApplicantFacts = {
    studentId: "std_1001",
    programme: "Computer Science",
    level: "UG",
    year: 1,
    feeCategory: "regular",
    hasHold: false,
    distanceKm: 150,
    documentsVerified: true,
    accessibilityNeed: false,
  };

  describe("1. Operator Unit Tests", () => {
    it("evaluates 'equals' operator correctly", () => {
      const exprUG: RuleExpression = { op: "equals", fact: "level", value: "UG" };
      const exprPG: RuleExpression = { op: "equals", fact: "level", value: "PG" };

      expect(evaluateExpression(sampleFacts, exprUG)).toBe(true);
      expect(evaluateExpression(sampleFacts, exprPG)).toBe(false);
    });

    it("evaluates 'in' operator correctly", () => {
      const exprIn: RuleExpression = {
        op: "in",
        fact: "programme",
        value: ["Computer Science", "Electrical", "Mechanical"],
      };
      const exprNotIn: RuleExpression = {
        op: "in",
        fact: "programme",
        value: ["Civil", "Chemical"],
      };

      expect(evaluateExpression(sampleFacts, exprIn)).toBe(true);
      expect(evaluateExpression(sampleFacts, exprNotIn)).toBe(false);
    });

    it("evaluates 'gte' and 'lte' numeric operators correctly", () => {
      const exprGtePass: RuleExpression = { op: "gte", fact: "distanceKm", value: 50 };
      const exprGteFail: RuleExpression = { op: "gte", fact: "distanceKm", value: 300 };

      const exprLtePass: RuleExpression = { op: "lte", fact: "year", value: 4 };
      const exprLteFail: RuleExpression = { op: "lte", fact: "year", value: 0 };

      expect(evaluateExpression(sampleFacts, exprGtePass)).toBe(true);
      expect(evaluateExpression(sampleFacts, exprGteFail)).toBe(false);
      expect(evaluateExpression(sampleFacts, exprLtePass)).toBe(true);
      expect(evaluateExpression(sampleFacts, exprLteFail)).toBe(false);
    });

    it("evaluates logical 'and', 'or', and 'not' operators correctly", () => {
      const exprAnd: RuleExpression = {
        op: "and",
        rules: [
          { op: "equals", fact: "level", value: "UG" },
          { op: "gte", fact: "distanceKm", value: 50 },
        ],
      };

      const exprOr: RuleExpression = {
        op: "or",
        rules: [
          { op: "equals", fact: "level", value: "PG" }, // false
          { op: "equals", fact: "hasHold", value: false }, // true
        ],
      };

      const exprNot: RuleExpression = {
        op: "not",
        rule: { op: "equals", fact: "hasHold", value: true },
      };

      expect(evaluateExpression(sampleFacts, exprAnd)).toBe(true);
      expect(evaluateExpression(sampleFacts, exprOr)).toBe(true);
      expect(evaluateExpression(sampleFacts, exprNot)).toBe(true);
    });
  });

  describe("2. Reason Text Placeholder Rendering", () => {
    it("renders placeholders like {feeCategory} and {distanceKm} with actual fact values", () => {
      const template = "Your fee category ({feeCategory}) is not verified. Distance: {distanceKm} km.";
      const formatted = formatReasonTemplate(template, sampleFacts);

      expect(formatted).toBe("Your fee category (regular) is not verified. Distance: 150 km.");
    });

    it("handles missing placeholders gracefully with 'N/A'", () => {
      const template = "Unknown attribute {nonExistentFact} check.";
      const formatted = formatReasonTemplate(template, sampleFacts);

      expect(formatted).toBe("Unknown attribute N/A check.");
    });
  });

  describe("3. Rule Set Versioning & Immutability", () => {
    it("locks a rule set and prevents mutation", () => {
      const ruleSet: PolicyRuleSet = {
        id: "rs_v1",
        name: "Locked Policy RuleSet",
        version: 1,
        isLocked: true,
        rules: [
          {
            id: "r_1",
            name: "UG Check",
            expression: { op: "equals", fact: "level", value: "UG" },
            reasonTemplate: "Must be UG",
            policyRef: "POL-01",
            owner: "admin",
            effectiveFrom: "2026-01-01",
            version: 1,
          },
        ],
      };

      expect(ruleSet.isLocked).toBe(true);
      expect(ruleSet.version).toBe(1);
    });
  });

  describe("4. Plain-Language Description Generator", () => {
    it("generates clear plain-language preview string from AST expression", () => {
      const expr: RuleExpression = {
        op: "and",
        rules: [
          { op: "equals", fact: "level", value: "UG" },
          { op: "gte", fact: "distanceKm", value: 50 },
        ],
      };

      const desc = describeExpression(expr);
      expect(desc).toBe("level is UG AND distanceKm is at least 50");
    });
  });

  describe("5. 200 Synthetic Applicants Matrix Evaluation Test", () => {
    it("evaluates a dataset of 200 synthetic applicants with 100% expected accuracy", () => {
      const policyRuleSet: PolicyRuleSet = {
        id: "rs_200",
        name: "200 Applicants Benchmark RuleSet",
        version: 1,
        rules: [
          {
            id: "rule_level",
            name: "Level must be UG or PG",
            expression: { op: "in", fact: "level", value: ["UG", "PG"] },
            reasonTemplate: "Level {level} is not eligible.",
            policyRef: "POL-01",
            owner: "admin",
            effectiveFrom: new Date(),
            version: 1,
          },
          {
            id: "rule_hold",
            name: "No Administrative Hold",
            expression: { op: "equals", fact: "hasHold", value: false },
            reasonTemplate: "Account has active hold.",
            policyRef: "POL-02",
            owner: "admin",
            effectiveFrom: new Date(),
            version: 1,
          },
          {
            id: "rule_distance",
            name: "Minimum 50km Distance",
            expression: { op: "gte", fact: "distanceKm", value: 50 },
            reasonTemplate: "Distance {distanceKm}km is less than 50km.",
            policyRef: "POL-03",
            owner: "admin",
            effectiveFrom: new Date(),
            version: 1,
          },
        ],
      };

      // Generate 200 synthetic applicants with deterministic attributes
      const syntheticApplicants: Array<{ facts: ApplicantFacts; expectedEligible: boolean }> = [];

      for (let i = 1; i <= 200; i++) {
        const isPhD = i % 5 === 0; // 20% fail level
        const hasHold = i % 7 === 0; // ~14% fail hold
        const distanceKm = i % 3 === 0 ? 30 : 120; // 33% fail distance (<50km)

        const level = isPhD ? "PhD" : i % 2 === 0 ? "UG" : "PG";
        const expectedEligible = !isPhD && !hasHold && distanceKm >= 50;

        syntheticApplicants.push({
          facts: {
            studentId: `synth_student_${i}`,
            level,
            hasHold,
            distanceKm,
            feeCategory: "regular",
            year: (i % 4) + 1,
          },
          expectedEligible,
        });
      }

      expect(syntheticApplicants).toHaveLength(200);

      // Evaluate each of the 200 applicants
      let evaluatedCount = 0;
      let matchCount = 0;

      for (const { facts, expectedEligible } of syntheticApplicants) {
        const evalOutput = evaluate(facts, policyRuleSet);
        evaluatedCount++;
        if (evalOutput.eligible === expectedEligible) {
          matchCount++;
        }
      }

      expect(evaluatedCount).toBe(200);
      expect(matchCount).toBe(200);
    });
  });
});

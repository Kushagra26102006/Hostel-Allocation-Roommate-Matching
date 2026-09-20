import type { ApplicantFacts, RuleExpression, PolicyRule, PolicyRuleSet, RuleEvaluationResult, EvaluationOutput } from "./dsl.js";
/**
 * Evaluates a single DSL expression recursively against applicant facts.
 * Pure function with no side effects or I/O.
 */
export declare function evaluateExpression(facts: ApplicantFacts, expr: RuleExpression): boolean;
/**
 * Replaces placeholders in the reasonTemplate (e.g. "{feeCategory}") with actual values from facts.
 */
export declare function formatReasonTemplate(template: string, facts: ApplicantFacts): string;
/**
 * Evaluates a single policy rule against applicant facts.
 */
export declare function evaluateRule(facts: ApplicantFacts, rule: PolicyRule): RuleEvaluationResult;
/**
 * Pure evaluator — evaluates a complete RuleSet against applicant facts.
 * Returns overall eligible status and detailed rule-by-rule results.
 */
export declare function evaluate(facts: ApplicantFacts, ruleSet: PolicyRuleSet): EvaluationOutput;
/**
 * Generates a human-readable plain language summary of a DSL rule expression.
 */
export declare function describeExpression(expr: RuleExpression): string;
//# sourceMappingURL=evaluator.d.ts.map
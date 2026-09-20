import type {
  ApplicantFacts,
  RuleExpression,
  PolicyRule,
  PolicyRuleSet,
  RuleEvaluationResult,
  EvaluationOutput,
} from "./dsl.js";

function isFiniteNumber(val: unknown): val is number {
  return typeof val === "number" && Number.isFinite(val);
}

/**
 * Evaluates a single DSL expression recursively against applicant facts.
 * Pure function with no side effects or I/O.
 */
export function evaluateExpression(
  facts: ApplicantFacts,
  expr: RuleExpression,
  depth = 0,
): boolean {
  if (!expr || depth > 10) return false;

  switch (expr.op) {
    case "equals": {
      const factVal = facts[expr.fact];
      if (factVal === undefined || factVal === null) return false;
      return String(factVal).toLowerCase() === String(expr.value ?? "").toLowerCase();
    }
    case "in": {
      const factVal = facts[expr.fact];
      if (factVal === undefined || factVal === null || !Array.isArray(expr.value)) return false;
      return expr.value.some((val) => String(val).toLowerCase() === String(factVal).toLowerCase());
    }
    case "gte": {
      const raw = facts[expr.fact];
      if (!isFiniteNumber(raw) || !isFiniteNumber(expr.value)) return false;
      return raw >= expr.value;
    }
    case "lte": {
      const raw = facts[expr.fact];
      if (!isFiniteNumber(raw) || !isFiniteNumber(expr.value)) return false;
      return raw <= expr.value;
    }
    case "and": {
      if (!Array.isArray(expr.rules) || expr.rules.length === 0) return true;
      return expr.rules.every((child) => evaluateExpression(facts, child, depth + 1));
    }
    case "or": {
      if (!Array.isArray(expr.rules) || expr.rules.length === 0) return false;
      return expr.rules.some((child) => evaluateExpression(facts, child, depth + 1));
    }
    case "not": {
      const childRule = expr.rule as { fact?: string } | undefined;
      if (childRule && typeof childRule.fact === "string") {
        const rawVal = facts[childRule.fact];
        if (rawVal === undefined || rawVal === null || rawVal === "") {
          return false;
        }
      }
      return !evaluateExpression(facts, expr.rule, depth + 1);
    }
    default:
      return false;
  }
}

/**
 * Replaces placeholders in the reasonTemplate (e.g. "{feeCategory}") with actual values from facts.
 */
export function formatReasonTemplate(template: string, facts: ApplicantFacts): string {
  if (!template) return "";
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = facts[key];
    if (val === undefined || val === null) return "N/A";
    return String(val);
  });
}

/**
 * Evaluates a single policy rule against applicant facts.
 */
export function evaluateRule(facts: ApplicantFacts, rule: PolicyRule): RuleEvaluationResult {
  const passed = evaluateExpression(facts, rule.expression);
  const reason = formatReasonTemplate(rule.reasonTemplate, facts);

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    passed,
    reason,
    policyRef: rule.policyRef,
  };
}

/**
 * Pure evaluator — evaluates a complete RuleSet against applicant facts.
 * Returns overall eligible status and detailed rule-by-rule results.
 */
export function evaluate(facts: ApplicantFacts, ruleSet: PolicyRuleSet): EvaluationOutput {
  if (!ruleSet || !Array.isArray(ruleSet.rules) || ruleSet.rules.length === 0) {
    return { eligible: false, results: [] };
  }

  const now = new Date();
  if (ruleSet.effectiveFrom && new Date(ruleSet.effectiveFrom) > now) {
    return { eligible: false, results: [] };
  }
  if (ruleSet.effectiveTo && new Date(ruleSet.effectiveTo) < now) {
    return { eligible: false, results: [] };
  }

  const results = ruleSet.rules.map((rule) => evaluateRule(facts, rule));
  const eligible = results.every((r) => r.passed);

  return {
    eligible,
    results,
  };
}

export const evaluateRuleSet = evaluate;

/**
 * Generates a human-readable plain language summary of a DSL rule expression.
 */
export function describeExpression(expr: RuleExpression): string {
  if (!expr) return "";

  switch (expr.op) {
    case "equals":
      return `${expr.fact} is ${String(expr.value)}`;
    case "in":
      return `${expr.fact} is one of [${(expr.value || []).join(", ")}]`;
    case "gte":
      return `${expr.fact} is at least ${expr.value}`;
    case "lte":
      return `${expr.fact} is at most ${expr.value}`;
    case "and":
      return (expr.rules || []).map(describeExpression).join(" AND ");
    case "or":
      return `(${(expr.rules || []).map(describeExpression).join(" OR ")})`;
    case "not":
      return `NOT (${describeExpression(expr.rule)})`;
    default:
      return "";
  }
}

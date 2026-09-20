export type Operator = "equals" | "in" | "gte" | "lte" | "and" | "or" | "not";

export interface ApplicantFacts {
  studentId?: string;
  programme?: string;
  level?: "UG" | "PG" | "PhD" | string;
  year?: number;
  feeCategory?: string;
  hasHold?: boolean;
  distanceKm?: number;
  documentsVerified?: boolean;
  accessibilityNeed?: boolean;
  [key: string]: unknown;
}

export type RuleExpression =
  | { op: "equals"; fact: string; value: unknown }
  | { op: "in"; fact: string; value: unknown[] }
  | { op: "gte"; fact: string; value: number }
  | { op: "lte"; fact: string; value: number }
  | { op: "and"; rules: RuleExpression[] }
  | { op: "or"; rules: RuleExpression[] }
  | { op: "not"; rule: RuleExpression };

export interface PolicyRule {
  id: string;
  name: string;
  expression: RuleExpression;
  reasonTemplate: string;
  policyRef: string;
  owner: string;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date;
  version: number;
}

export interface PolicyRuleSet {
  id: string;
  name: string;
  version: number;
  isLocked?: boolean;
  rules: PolicyRule[];
}

export interface RuleEvaluationResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  reason: string;
  policyRef: string;
}

export interface EvaluationOutput {
  eligible: boolean;
  results: RuleEvaluationResult[];
}

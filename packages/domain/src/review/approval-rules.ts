/**
 * @hostelhub/domain — review/approval-rules.ts
 *
 * Approval and Maker-Checker Verification Rules:
 *   - Approval is allowed only if every override has a non-empty reason (>= 10 chars).
 *   - Invariants must hold with zero errors.
 *   - Escalated overrides mandate a distinct second approver (Maker-Checker).
 */

export interface ApproverInfo {
  userId: string;
  name: string;
  email: string;
  role: "warden" | "chief_warden" | "dean" | "hostel_admin" | "sys_admin";
}

export interface DraftOverrideSummary {
  overrideId: string;
  studentId: string;
  reason: string;
  escalated: boolean;
  escalationReasons?: string[];
}

export interface ApprovalEvaluationInput {
  draftState: string;
  overrides: DraftOverrideSummary[];
  hasInvariantErrors: boolean;
  approver: ApproverInfo;
  secondApprover?: ApproverInfo | undefined;
  comment?: string | undefined;
}

export interface ApprovalEvaluationResult {
  allowed: boolean;
  requiresSecondApprover: boolean;
  code?:
    | "INVALID_STATE"
    | "INVARIANT_VIOLATION"
    | "OVERRIDE_MISSING_REASON"
    | "MISSING_SECOND_APPROVER"
    | "DUPLICATE_APPROVER"
    | undefined;
  reason?: string | undefined;
  escalatedOverridesCount: number;
}

/**
 * Pure function: evaluates whether an approval submission satisfies all governance rules.
 */
export function evaluateApprovalRequirements(
  input: ApprovalEvaluationInput,
): ApprovalEvaluationResult {
  // 1. Status must be UNDER_REVIEW
  if (input.draftState !== "UNDER_REVIEW") {
    return {
      allowed: false,
      requiresSecondApprover: false,
      code: "INVALID_STATE",
      reason: `Approval is only allowed when draft is UNDER_REVIEW (current status: ${input.draftState}).`,
      escalatedOverridesCount: 0,
    };
  }

  // 2. Invariant verification
  if (input.hasInvariantErrors) {
    return {
      allowed: false,
      requiresSecondApprover: false,
      code: "INVARIANT_VIOLATION",
      reason: "Cannot approve draft: allocation invariants or hard constraints are violated.",
      escalatedOverridesCount: 0,
    };
  }

  // 3. Every override must have a valid reason (>= 10 chars)
  for (const ov of input.overrides) {
    if (!ov.reason || ov.reason.trim().length < 10) {
      return {
        allowed: false,
        requiresSecondApprover: false,
        code: "OVERRIDE_MISSING_REASON",
        reason: `Override for student '${ov.studentId}' lacks a mandatory justification (minimum 10 chars).`,
        escalatedOverridesCount: 0,
      };
    }
  }

  // 4. Count escalated overrides
  const escalatedOverrides = input.overrides.filter((o) => o.escalated);
  const requiresSecondApprover = escalatedOverrides.length > 0;

  // 5. Maker-checker enforcement
  if (requiresSecondApprover) {
    if (!input.secondApprover) {
      return {
        allowed: false,
        requiresSecondApprover: true,
        code: "MISSING_SECOND_APPROVER",
        reason: `Draft contains ${escalatedOverrides.length} escalated override(s). A second approver (Maker-Checker) is mandatory.`,
        escalatedOverridesCount: escalatedOverrides.length,
      };
    }

    if (input.secondApprover.userId === input.approver.userId) {
      return {
        allowed: false,
        requiresSecondApprover: true,
        code: "DUPLICATE_APPROVER",
        reason:
          "Maker-Checker violation: primary approver and second approver must be different users.",
        escalatedOverridesCount: escalatedOverrides.length,
      };
    }
  }

  return {
    allowed: true,
    requiresSecondApprover,
    escalatedOverridesCount: escalatedOverrides.length,
  };
}

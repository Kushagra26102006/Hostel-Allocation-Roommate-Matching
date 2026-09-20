/**
 * @hostelhub/domain — review/state-machine.ts
 *
 * Pure Draft Workflow State Machine:
 *   GENERATING -> DRAFT_READY -> UNDER_REVIEW -> APPROVED -> PUBLISHED
 *
 * Side paths:
 *   - CHANGES_REQUESTED (from UNDER_REVIEW, returns to UNDER_REVIEW)
 *   - FAILED (from GENERATING)
 *   - DISCARDED (from DRAFT_READY, UNDER_REVIEW, CHANGES_REQUESTED)
 *   - AMENDED (from PUBLISHED when an approved amendment creates a new draft version)
 *   - ARCHIVED (when a published draft is superseded by an amendment)
 *
 * Pure function: zero I/O, zero Node dependencies.
 */

export type DraftState =
  | "GENERATING"
  | "DRAFT_READY"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "AMENDED"
  | "ARCHIVED"
  | "DISCARDED"
  | "FAILED";

export type DraftStatus = DraftState;

export type WorkflowRole =
  "system" | "hostel_admin" | "warden" | "chief_warden" | "sys_admin" | "admin";

export type UserRole = WorkflowRole;

export interface TransitionGuardContext {
  comment?: string | undefined;
  approvalRecordId?: string | undefined;
  hasOverridesWithoutReason?: boolean | undefined;
  hasInvariantErrors?: boolean | undefined;
  isMakerCheckerSatisfied?: boolean | undefined;
  isHostelScoped?: boolean | undefined;
  hostelMatch?: boolean | undefined;
}

export interface TransitionDefinition {
  from: DraftState;
  to: DraftState;
  allowedRoles: readonly WorkflowRole[];
  guard?: (context: TransitionGuardContext) => { valid: boolean; reason?: string };
}

export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly from: DraftState,
    public readonly to: DraftState,
    public readonly role: WorkflowRole,
    reason: string,
  ) {
    super(`Cannot transition draft from ${from} to ${to} by ${role}: ${reason}`);
    this.name = "InvalidStateTransitionError";
    Object.setPrototypeOf(this, InvalidStateTransitionError.prototype);
  }
}

export const DRAFT_TRANSITIONS: readonly TransitionDefinition[] = [
  // 1. GENERATING -> DRAFT_READY
  {
    from: "GENERATING",
    to: "DRAFT_READY",
    allowedRoles: ["system", "hostel_admin", "sys_admin"],
  },
  // 2. GENERATING -> FAILED
  {
    from: "GENERATING",
    to: "FAILED",
    allowedRoles: ["system", "hostel_admin", "sys_admin"],
  },
  // 3. DRAFT_READY -> UNDER_REVIEW
  {
    from: "DRAFT_READY",
    to: "UNDER_REVIEW",
    allowedRoles: ["hostel_admin", "chief_warden", "sys_admin"],
  },
  // 4. DRAFT_READY -> DISCARDED
  {
    from: "DRAFT_READY",
    to: "DISCARDED",
    allowedRoles: ["hostel_admin", "chief_warden", "sys_admin"],
  },
  // 5. UNDER_REVIEW -> CHANGES_REQUESTED
  {
    from: "UNDER_REVIEW",
    to: "CHANGES_REQUESTED",
    allowedRoles: ["warden", "chief_warden"],
    guard: (ctx) => {
      if (!ctx.comment || ctx.comment.trim().length < 10) {
        return {
          valid: false,
          reason: "Requesting changes requires a mandatory comment of at least 10 characters.",
        };
      }
      return { valid: true };
    },
  },
  // 6. CHANGES_REQUESTED -> UNDER_REVIEW
  {
    from: "CHANGES_REQUESTED",
    to: "UNDER_REVIEW",
    allowedRoles: ["hostel_admin", "warden", "chief_warden", "sys_admin"],
  },
  // 7. UNDER_REVIEW -> APPROVED
  {
    from: "UNDER_REVIEW",
    to: "APPROVED",
    allowedRoles: ["warden", "chief_warden"],
    guard: (ctx) => {
      if (ctx.hasOverridesWithoutReason) {
        return {
          valid: false,
          reason: "Cannot approve draft: one or more overrides lack a valid explanation.",
        };
      }
      if (ctx.hasInvariantErrors) {
        return {
          valid: false,
          reason: "Cannot approve draft: hard constraints or invariant checks failed.",
        };
      }
      if (ctx.isMakerCheckerSatisfied === false) {
        return {
          valid: false,
          reason: "Cannot approve draft: escalated overrides require a second distinct approver.",
        };
      }
      return { valid: true };
    },
  },
  // 8. UNDER_REVIEW -> DISCARDED
  {
    from: "UNDER_REVIEW",
    to: "DISCARDED",
    allowedRoles: ["hostel_admin", "chief_warden", "sys_admin"],
  },
  // 9. CHANGES_REQUESTED -> DISCARDED
  {
    from: "CHANGES_REQUESTED",
    to: "DISCARDED",
    allowedRoles: ["hostel_admin", "chief_warden", "sys_admin"],
  },
  // 10. APPROVED -> PUBLISHED
  {
    from: "APPROVED",
    to: "PUBLISHED",
    allowedRoles: ["warden", "chief_warden"],
    guard: (ctx) => {
      if (!ctx.approvalRecordId) {
        return {
          valid: false,
          reason: "Publish gate violated: cannot publish draft without a valid approval record.",
        };
      }
      if (ctx.isHostelScoped && ctx.hostelMatch === false) {
        return {
          valid: false,
          reason: "Wardens may only publish drafts for their assigned hostel.",
        };
      }
      return { valid: true };
    },
  },
  // 11. APPROVED -> UNDER_REVIEW (revocation)
  {
    from: "APPROVED",
    to: "UNDER_REVIEW",
    allowedRoles: ["chief_warden", "sys_admin"],
  },
  // 12. PUBLISHED -> AMENDED (creates new version)
  {
    from: "PUBLISHED",
    to: "AMENDED",
    allowedRoles: ["chief_warden", "hostel_admin", "sys_admin"],
  },
  // 13. PUBLISHED -> ARCHIVED (when superseded)
  {
    from: "PUBLISHED",
    to: "ARCHIVED",
    allowedRoles: ["system", "chief_warden", "hostel_admin", "sys_admin"],
  },
  // 14. AMENDED -> ARCHIVED
  {
    from: "AMENDED",
    to: "ARCHIVED",
    allowedRoles: ["system", "chief_warden", "hostel_admin", "sys_admin"],
  },
];

/**
 * Pure function: Checks if a state transition is permitted.
 */
export function canTransition(
  from: DraftState,
  to: DraftState,
  role: WorkflowRole,
  context: TransitionGuardContext = {},
): { allowed: boolean; reason?: string } {
  const transition = DRAFT_TRANSITIONS.find((t) => t.from === from && t.to === to);
  if (!transition) {
    return {
      allowed: false,
      reason: `No transition path exists from '${from}' to '${to}'.`,
    };
  }

  if (!transition.allowedRoles.includes(role)) {
    return {
      allowed: false,
      reason: `Role '${role}' is not authorized to transition draft from '${from}' to '${to}'.`,
    };
  }

  if (transition.guard) {
    const guardResult = transition.guard(context);
    if (!guardResult.valid) {
      return {
        allowed: false,
        reason: guardResult.reason ?? "Transition guard check failed.",
      };
    }
  }

  return { allowed: true };
}

/**
 * Pure function: Transitions draft to new state or throws InvalidStateTransitionError.
 */
export function transitionDraftState(
  from: DraftState,
  to: DraftState,
  role: WorkflowRole,
  context: TransitionGuardContext = {},
): DraftState {
  const check = canTransition(from, to, role, context);
  if (!check.allowed) {
    throw new InvalidStateTransitionError(from, to, role, check.reason ?? "Disallowed transition");
  }
  return to;
}

export const ALLOCATION_QUEUE_NAME = "allocation";
export const SIMULATION_QUEUE_NAME = "simulation";
export const LETTERS_QUEUE_NAME = "allocation-letters";
export const NOTIFICATIONS_QUEUE_NAME = "notifications";
export const APPEAL_ESCALATION_QUEUE_NAME = "appeal-escalation";
export const REPORTS_QUEUE_NAME = "reports";
export const REPORTS_SCHEDULED_QUEUE_NAME = "reports-scheduled";
export const DEFAULT_SLA_WORKING_DAYS = 3;

export interface SimulationJobPayload {
  institutionId: string;
  cycleId: string;
  baseRunId?: string | undefined;
  seed?: number | undefined;
  scenarios: unknown[];
  actor: {
    id: string;
    email: string;
    role: string;
  };
}

export interface ReportJobPayload {
  reportType:
    | "occupancy"
    | "preference_satisfaction"
    | "override_analysis"
    | "waitlist_movement"
    | "cycle_time"
    | "accessibility_compliance"
    | "year_on_year"
    | "fairness";
  format: "csv" | "xlsx" | "pdf";
  institutionId: string;
  cycleId?: string | undefined;
  requestedByUserId: string;
}

export interface ScheduledSummaryPayload {
  institutionId: string;
  cycleId?: string | undefined;
}

export function getAllocationEventChannel(runId: string): string {
  return `allocation:run:${runId}:events`;
}

export function getAllocationCancelKey(runId: string): string {
  return `allocation:run:${runId}:cancel`;
}

export function getLetterProgressChannel(draftId: string): string {
  return `letters:draft:${draftId}:progress`;
}

export function getUserNotificationChannel(userId: string): string {
  return `user:${userId}:notifications`;
}

export interface LettersJobPayload {
  draftId: string;
  institutionId: string;
  chunkSize?: number | undefined;
}

export interface AllocationJobPayload {
  runId: string;
  cycleId: string;
  institutionId: string;
  seed: number;
  weightsVersion?: string | undefined;
  dryRun?: boolean | undefined;
}

export type AllocationStageCode =
  | "freeze"
  | "eligibility"
  | "sort"
  | "group"
  | "assign"
  | "local_search"
  | "waitlist"
  | "invariants"
  | "persist";

export interface AllocationProgressEvent {
  runId: string;
  stageCode: AllocationStageCode;
  stageLabel: string;
  percent: number;
  message: string;
  current?: number | undefined;
  total?: number | undefined;
  timestamp: string;
  metrics?: unknown | undefined;
  draftId?: string | undefined;
  error?: string | undefined;
  completed?: boolean | undefined;
  cancelled?: boolean | undefined;
}

export const STAGE_CONFIGS: Record<
  AllocationStageCode,
  { label: string; basePercent: number; maxPercent: number }
> = {
  freeze: { label: "Freeze", basePercent: 0, maxPercent: 10 },
  eligibility: { label: "Eligibility", basePercent: 10, maxPercent: 20 },
  sort: { label: "Priority", basePercent: 20, maxPercent: 30 },
  group: { label: "Groups", basePercent: 30, maxPercent: 40 },
  assign: { label: "Assign", basePercent: 40, maxPercent: 70 },
  local_search: { label: "Improve", basePercent: 70, maxPercent: 85 },
  waitlist: { label: "Waitlist", basePercent: 85, maxPercent: 90 },
  invariants: { label: "Validate", basePercent: 90, maxPercent: 95 },
  persist: { label: "Persist", basePercent: 95, maxPercent: 100 },
};

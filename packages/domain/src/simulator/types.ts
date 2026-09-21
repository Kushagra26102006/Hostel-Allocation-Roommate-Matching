/**
 * @hostelhub/domain — simulator/types.ts
 *
 * Types for the What-If Simulator:
 * - Scenario configuration (overrides for weights, quotas, capacity, accessibility)
 * - Simulation results per scenario
 * - Student outcome divergence tracking
 * - Comparative metrics and difference highlighting
 */

import type { RunMetrics, Weights } from "../allocation/types.js";

export interface CapacityOverride {
  /** Array of block IDs to close / exclude from available inventory */
  closedBlockIds?: string[] | undefined;
  /** Array of hostel IDs to close / exclude from available inventory */
  closedHostelIds?: string[] | undefined;
  /** Array of individual room IDs to close / exclude */
  closedRoomIds?: string[] | undefined;
}

export interface ScenarioDefinition {
  /** Client-generated or sequential identifier, e.g. "scenario-1" */
  id: string;
  /** Human-readable scenario name, e.g. "Scenario A: Close Gargi Block 1" */
  name: string;
  /** Optional scenario notes or rationale */
  description?: string | undefined;
  /** Identifier of weights version to use, e.g. "wv-2026-v2" */
  weightsVersion?: string | undefined;
  /** Custom granular scoring weight overrides */
  customWeights?: Partial<Weights> | undefined;
  /** Quota bucket seat count overrides, e.g. { "General": 120, "OBC": 50 } */
  quotaOverrides?: Record<string, number> | undefined;
  /** Physical capacity adjustments (closed blocks, hostels, rooms) */
  capacityOverrides?: CapacityOverride | undefined;
  /** Cutoff date for accessibility reservation allocation */
  accessibilityReservationDate?: string | undefined;
}

export interface StudentPlacementOutcome {
  studentId: string;
  studentName?: string | undefined;
  rollNumber?: string | undefined;
  quotaCategory: string;
  priorityScore: number;
  status: "placed" | "waitlisted" | "rejected";
  hostelId?: string | undefined;
  hostelName?: string | undefined;
  roomId?: string | undefined;
  roomNumber?: string | undefined;
  bedId?: string | undefined;
  rankSatisfied?: number | null | undefined;
  score?: number | undefined;
  waitlistRank?: number | undefined;
}

export interface SimulationResult {
  scenarioId: string;
  scenarioName: string;
  description?: string | undefined;
  config: ScenarioDefinition;
  runId: string;
  draftId?: string | undefined;
  seed: number;
  durationMs: number;
  metrics: RunMetrics;
  totalPlaced: number;
  totalWaitlisted: number;
  firstChoiceRate: number;
  meanCompatibility: number;
  parityGap: number;
  priorityInversions: number;
  giniCoefficient: number;
  /** Keyed by studentId */
  outcomes: Record<string, StudentPlacementOutcome>;
}

export interface MetricDelta {
  metric: string;
  label: string;
  unit: string;
  higherIsBetter: boolean;
  baseValue: number;
  scenarioValue: number;
  absoluteDelta: number;
  percentageDelta: number;
  isImproved: boolean;
  isDegraded: boolean;
}

export interface StudentOutcomeDiff {
  studentId: string;
  studentName: string;
  rollNumber: string;
  quotaCategory: string;
  priorityScore: number;
  /** Map of scenarioId -> outcome */
  outcomesByScenario: Record<string, StudentPlacementOutcome>;
  /** Outcome differed between scenarios */
  hasDiff: boolean;
  /** Description of change, e.g. "Gargi 201 (Rank 1) -> Aryabhata 304 (Rank 2)" */
  summary: string;
}

export interface ScenarioComparison {
  seed: number;
  baseScenarioId: string;
  scenarios: SimulationResult[];
  /** Metric deltas for each scenario compared to base */
  deltasByScenario: Record<string, MetricDelta[]>;
  /** Total count of students whose outcome differed across any of the scenarios */
  divergentStudentsCount: number;
  /** List of all students whose outcome differed */
  divergentStudents: StudentOutcomeDiff[];
}

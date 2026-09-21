/**
 * @hostelhub/domain — simulator/scenario-differ.ts
 *
 * Pure function engine for comparing simulation results:
 * - Computes metric deltas with improvement/degradation indicators
 * - Detects divergent student placement outcomes
 * - Formulates summary outcome difference descriptions
 */

import type {
  SimulationResult,
  MetricDelta,
  StudentOutcomeDiff,
  ScenarioComparison,
  StudentPlacementOutcome,
} from "./types.js";

/**
 * Computes difference deltas between a base scenario and a target scenario.
 */
export function calculateMetricDeltas(
  base: SimulationResult,
  target: SimulationResult,
): MetricDelta[] {
  const definitions: Array<{
    metric: string;
    label: string;
    unit: string;
    higherIsBetter: boolean;
    baseVal: number;
    targetVal: number;
  }> = [
    {
      metric: "totalPlaced",
      label: "Placed Students",
      unit: "students",
      higherIsBetter: true,
      baseVal: base.totalPlaced,
      targetVal: target.totalPlaced,
    },
    {
      metric: "totalWaitlisted",
      label: "Waitlist Size",
      unit: "students",
      higherIsBetter: false,
      baseVal: base.totalWaitlisted,
      targetVal: target.totalWaitlisted,
    },
    {
      metric: "firstChoiceRate",
      label: "1st Choice Satisfaction",
      unit: "%",
      higherIsBetter: true,
      baseVal: Math.round(base.firstChoiceRate * 1000) / 10,
      targetVal: Math.round(target.firstChoiceRate * 1000) / 10,
    },
    {
      metric: "meanCompatibility",
      label: "Avg Roommate Compatibility",
      unit: "%",
      higherIsBetter: true,
      baseVal: Math.round(base.meanCompatibility * 1000) / 10,
      targetVal: Math.round(target.meanCompatibility * 1000) / 10,
    },
    {
      metric: "parityGap",
      label: "Category Parity Gap",
      unit: "%",
      higherIsBetter: false,
      baseVal: Math.round(base.parityGap * 1000) / 10,
      targetVal: Math.round(target.parityGap * 1000) / 10,
    },
    {
      metric: "priorityInversions",
      label: "Priority Inversions",
      unit: "violations",
      higherIsBetter: false,
      baseVal: base.priorityInversions,
      targetVal: target.priorityInversions,
    },
    {
      metric: "giniCoefficient",
      label: "Gini Inequality",
      unit: "",
      higherIsBetter: false,
      baseVal: Math.round(base.giniCoefficient * 10000) / 10000,
      targetVal: Math.round(target.giniCoefficient * 10000) / 10000,
    },
  ];

  return definitions.map((def) => {
    const absDelta = Math.round((def.targetVal - def.baseVal) * 1000) / 1000;
    const pctDelta =
      def.baseVal !== 0
        ? Math.round(((def.targetVal - def.baseVal) / Math.abs(def.baseVal)) * 1000) / 10
        : absDelta === 0
          ? 0
          : 100;

    let isImproved = false;
    let isDegraded = false;

    if (absDelta !== 0) {
      if (def.higherIsBetter) {
        isImproved = absDelta > 0;
        isDegraded = absDelta < 0;
      } else {
        isImproved = absDelta < 0;
        isDegraded = absDelta > 0;
      }
    }

    return {
      metric: def.metric,
      label: def.label,
      unit: def.unit,
      higherIsBetter: def.higherIsBetter,
      baseValue: def.baseVal,
      scenarioValue: def.targetVal,
      absoluteDelta: absDelta,
      percentageDelta: pctDelta,
      isImproved,
      isDegraded,
    };
  });
}

/**
 * Compares an array of SimulationResults (up to 3 scenarios) and generates:
 * 1. Metric deltas for each non-base scenario vs base (the first scenario)
 * 2. Full cross-scenario divergent student outcome list
 */
export function compareScenarios(results: SimulationResult[]): ScenarioComparison {
  if (results.length === 0) {
    return {
      seed: 0,
      baseScenarioId: "",
      scenarios: [],
      deltasByScenario: {},
      divergentStudentsCount: 0,
      divergentStudents: [],
    };
  }

  const base = results[0]!;
  const seed = base.seed;
  const baseId = base.scenarioId;

  // 1. Compute metric deltas for each scenario vs base
  const deltasByScenario: Record<string, MetricDelta[]> = {};
  for (const scenario of results) {
    if (scenario.scenarioId === baseId) {
      // Delta with itself is zero
      deltasByScenario[scenario.scenarioId] = calculateMetricDeltas(base, base);
    } else {
      deltasByScenario[scenario.scenarioId] = calculateMetricDeltas(base, scenario);
    }
  }

  // 2. Identify unique students across all scenarios
  const allStudentIds = new Set<string>();
  for (const s of results) {
    for (const sid of Object.keys(s.outcomes)) {
      allStudentIds.add(sid);
    }
  }

  // 3. For each student, check whether outcomes differ across scenarios
  const divergentStudents: StudentOutcomeDiff[] = [];

  for (const studentId of allStudentIds) {
    const outcomesByScenario: Record<string, StudentPlacementOutcome> = {};
    let studentName = "Student";
    let rollNumber = "";
    let quotaCategory = "General";
    let priorityScore = 0;

    for (const s of results) {
      const outcome = s.outcomes[studentId];
      if (outcome) {
        outcomesByScenario[s.scenarioId] = outcome;
        if (outcome.studentName) studentName = outcome.studentName;
        if (outcome.rollNumber) rollNumber = outcome.rollNumber;
        if (outcome.quotaCategory) quotaCategory = outcome.quotaCategory;
        if (outcome.priorityScore) priorityScore = outcome.priorityScore;
      } else {
        outcomesByScenario[s.scenarioId] = {
          studentId,
          status: "waitlisted",
          quotaCategory,
          priorityScore,
        };
      }
    }

    // Check divergence across the outcomes
    let hasDiff = false;
    const scenarioIds = results.map((r) => r.scenarioId);

    if (scenarioIds.length > 1) {
      const firstOutcome = outcomesByScenario[scenarioIds[0]!];
      for (let i = 1; i < scenarioIds.length; i++) {
        const otherOutcome = outcomesByScenario[scenarioIds[i]!];
        if (
          firstOutcome?.status !== otherOutcome?.status ||
          firstOutcome?.hostelId !== otherOutcome?.hostelId ||
          firstOutcome?.roomId !== otherOutcome?.roomId ||
          firstOutcome?.bedId !== otherOutcome?.bedId ||
          firstOutcome?.rankSatisfied !== otherOutcome?.rankSatisfied
        ) {
          hasDiff = true;
          break;
        }
      }
    }

    if (hasDiff) {
      // Build summary of differences
      const summaryParts = results.map((s) => {
        const out = outcomesByScenario[s.scenarioId];
        if (!out || out.status === "waitlisted") {
          return `${s.scenarioName}: Waitlisted`;
        }
        const rankStr = out.rankSatisfied ? ` (Choice ${out.rankSatisfied})` : "";
        const locationStr = out.roomNumber
          ? `${out.hostelName || "Hostel"} ${out.roomNumber}`
          : out.hostelName || "Assigned";
        return `${s.scenarioName}: ${locationStr}${rankStr}`;
      });

      divergentStudents.push({
        studentId,
        studentName,
        rollNumber,
        quotaCategory,
        priorityScore,
        outcomesByScenario,
        hasDiff: true,
        summary: summaryParts.join(" ➔ "),
      });
    }
  }

  // Sort divergent students by priority score descending
  divergentStudents.sort((a, b) => b.priorityScore - a.priorityScore);

  return {
    seed,
    baseScenarioId: baseId,
    scenarios: results,
    deltasByScenario,
    divergentStudentsCount: divergentStudents.length,
    divergentStudents,
  };
}

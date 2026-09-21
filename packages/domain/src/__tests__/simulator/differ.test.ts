import { describe, it, expect } from "vitest";
import { calculateMetricDeltas, compareScenarios } from "../../simulator/scenario-differ.js";
import type { SimulationResult } from "../../simulator/types.js";
import type { RunMetrics } from "../../allocation/types.js";

function createMockResult(
  scenarioId: string,
  scenarioName: string,
  metricsOverrides: Partial<RunMetrics> = {},
  outcomes: SimulationResult["outcomes"] = {},
): SimulationResult {
  const metrics: RunMetrics = {
    cycleId: "cycle-1",
    inputHash: "dummy-hash",
    totalUnits: 100,
    assigned: 90,
    unassigned: 10,
    rejected: 0,
    constraintViolations: 0,
    durationMs: 120,
    firstChoiceRate: 0.85,
    avgRankSatisfied: 1.2,
    giniPreferenceScore: 0.05,
    categoryParityGap: 0.04,
    priorityInversions: 0,
    meanRoomCompatibility: 0.88,
    minRoomCompatibility: 0.6,
    ...metricsOverrides,
  };

  return {
    scenarioId,
    scenarioName,
    config: { id: scenarioId, name: scenarioName },
    runId: `run-${scenarioId}`,
    seed: 42,
    durationMs: 120,
    metrics,
    totalPlaced: metrics.assigned,
    totalWaitlisted: metrics.unassigned,
    firstChoiceRate: metrics.firstChoiceRate,
    meanCompatibility: metrics.meanRoomCompatibility,
    parityGap: metrics.categoryParityGap,
    priorityInversions: metrics.priorityInversions,
    giniCoefficient: metrics.giniPreferenceScore,
    outcomes,
  };
}

describe("What-If Simulator Domain Differ", () => {
  it("computes metric deltas and labels improvements/degradations accurately", () => {
    const base = createMockResult("base", "Base Run", {
      assigned: 90,
      unassigned: 10,
      firstChoiceRate: 0.8,
      giniPreferenceScore: 0.06,
    });

    const scenarioA = createMockResult("sc-a", "Scenario A", {
      assigned: 95,
      unassigned: 5,
      firstChoiceRate: 0.9,
      giniPreferenceScore: 0.04,
    });

    const deltas = calculateMetricDeltas(base, scenarioA);

    const placedDelta = deltas.find((d) => d.metric === "totalPlaced");
    expect(placedDelta).toBeDefined();
    expect(placedDelta?.baseValue).toBe(90);
    expect(placedDelta?.scenarioValue).toBe(95);
    expect(placedDelta?.absoluteDelta).toBe(5);
    expect(placedDelta?.isImproved).toBe(true);
    expect(placedDelta?.isDegraded).toBe(false);

    const waitlistDelta = deltas.find((d) => d.metric === "totalWaitlisted");
    expect(waitlistDelta).toBeDefined();
    expect(waitlistDelta?.baseValue).toBe(10);
    expect(waitlistDelta?.scenarioValue).toBe(5);
    expect(waitlistDelta?.absoluteDelta).toBe(-5);
    expect(waitlistDelta?.isImproved).toBe(true); // lower waitlist is better!

    const giniDelta = deltas.find((d) => d.metric === "giniCoefficient");
    expect(giniDelta).toBeDefined();
    expect(giniDelta?.isImproved).toBe(true); // lower Gini is better!
  });

  it("identifies students with divergent outcomes across scenarios", () => {
    const s1 = "student-1";
    const s2 = "student-2";
    const s3 = "student-3";

    const baseOutcomes: SimulationResult["outcomes"] = {
      [s1]: {
        studentId: s1,
        studentName: "Aarav Sharma",
        quotaCategory: "General",
        priorityScore: 95,
        status: "placed",
        hostelId: "h1",
        hostelName: "Aryabhata",
        roomId: "r101",
        roomNumber: "101",
        rankSatisfied: 1,
      },
      [s2]: {
        studentId: s2,
        studentName: "Priya Patel",
        quotaCategory: "General",
        priorityScore: 80,
        status: "placed",
        hostelId: "h2",
        hostelName: "Gargi",
        roomId: "r201",
        roomNumber: "201",
        rankSatisfied: 1,
      },
      [s3]: {
        studentId: s3,
        studentName: "Rohan Verma",
        quotaCategory: "General",
        priorityScore: 60,
        status: "waitlisted",
      },
    };

    const scenarioAOutcomes: SimulationResult["outcomes"] = {
      [s1]: {
        studentId: s1,
        studentName: "Aarav Sharma",
        quotaCategory: "General",
        priorityScore: 95,
        status: "placed",
        hostelId: "h1",
        hostelName: "Aryabhata",
        roomId: "r101",
        roomNumber: "101",
        rankSatisfied: 1, // Same outcome
      },
      [s2]: {
        studentId: s2,
        studentName: "Priya Patel",
        quotaCategory: "General",
        priorityScore: 80,
        status: "waitlisted", // Waitlisted in scenario A!
      },
      [s3]: {
        studentId: s3,
        studentName: "Rohan Verma",
        quotaCategory: "General",
        priorityScore: 60,
        status: "placed", // Placed in scenario A!
        hostelId: "h3",
        hostelName: "Ramanujan",
        roomId: "r301",
        roomNumber: "301",
        rankSatisfied: 2,
      },
    };

    const base = createMockResult("base", "Base Run", {}, baseOutcomes);
    const scA = createMockResult("sc-a", "Scenario A: Close Gargi", {}, scenarioAOutcomes);

    const comparison = compareScenarios([base, scA]);

    expect(comparison.scenarios.length).toBe(2);
    expect(comparison.divergentStudentsCount).toBe(2); // s2 and s3 diverged, s1 is identical

    const divergentIds = comparison.divergentStudents.map((d) => d.studentId);
    expect(divergentIds).toContain(s2);
    expect(divergentIds).toContain(s3);
    expect(divergentIds).not.toContain(s1);

    const s2Diff = comparison.divergentStudents.find((d) => d.studentId === s2);
    expect(s2Diff?.hasDiff).toBe(true);
    expect(s2Diff?.summary).toContain("Gargi 201");
    expect(s2Diff?.summary).toContain("Waitlisted");
  });

  it("handles 3-scenario comparison and empty results gracefully", () => {
    const emptyComp = compareScenarios([]);
    expect(emptyComp.scenarios).toHaveLength(0);
    expect(emptyComp.divergentStudentsCount).toBe(0);

    const r1 = createMockResult("r1", "Run 1");
    const r2 = createMockResult("r2", "Run 2");
    const r3 = createMockResult("r3", "Run 3");

    const threeWay = compareScenarios([r1, r2, r3]);
    expect(threeWay.scenarios).toHaveLength(3);
    expect(threeWay.deltasByScenario["r1"]).toBeDefined();
    expect(threeWay.deltasByScenario["r2"]).toBeDefined();
    expect(threeWay.deltasByScenario["r3"]).toBeDefined();
  });
});

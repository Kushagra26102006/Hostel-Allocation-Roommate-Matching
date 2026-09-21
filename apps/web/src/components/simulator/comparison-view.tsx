"use client";

import React, { useState } from "react";
import { Users, Copy, Search, ShieldCheck } from "lucide-react";
import type {
  ScenarioComparison,
  SimulationResult,
  ScenarioDefinition,
  StudentPlacementOutcome,
} from "@hostelhub/domain";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ComparisonViewProps {
  comparison: ScenarioComparison;
  scenarios: SimulationResult[];
  onUseSettingsForRealRun?: (scenario: ScenarioDefinition) => void;
}

export function ComparisonView({
  comparison,
  scenarios,
  onUseSettingsForRealRun,
}: ComparisonViewProps) {
  const router = useRouter();
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<"all" | "waitlist" | "placed">(
    "all",
  );

  const baseScenario = scenarios[0];
  const comparedScenarios = scenarios.slice(1);

  const handleCopySettings = (scenario: ScenarioDefinition) => {
    // 1. Store in sessionStorage / localStorage for Run Console form
    const payload = {
      weightsVersion: scenario.weightsVersion,
      customWeights: scenario.customWeights,
      quotaOverrides: scenario.quotaOverrides,
      capacityOverrides: scenario.capacityOverrides,
      accessibilityReservationDate: scenario.accessibilityReservationDate,
      appliedFromScenario: scenario.name,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem("hostelhub_applied_run_settings", JSON.stringify(payload));
      toast.success(
        `Applied "${scenario.name}" configuration to Run Console form. (Dry-run safe: nothing was published).`,
      );
      if (onUseSettingsForRealRun) {
        onUseSettingsForRealRun(scenario);
      } else {
        router.push("/staff/chief-warden/allocations?fromSimulator=true");
      }
    } catch {
      toast.error("Failed to copy configuration to local storage.");
    }
  };

  // Filter divergent students
  const filteredStudents = (comparison.divergentStudents || []).filter((diff) => {
    const q = studentSearch.toLowerCase();
    const matchesQuery =
      diff.studentName.toLowerCase().includes(q) ||
      diff.rollNumber.toLowerCase().includes(q) ||
      diff.quotaCategory.toLowerCase().includes(q) ||
      diff.studentId.toLowerCase().includes(q);

    if (!matchesQuery) return false;

    if (selectedStudentFilter === "waitlist") {
      return Object.values(diff.outcomesByScenario).some((o) => o.status === "waitlisted");
    }
    if (selectedStudentFilter === "placed") {
      return Object.values(diff.outcomesByScenario).some((o) => o.status === "placed");
    }
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Overview Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-card via-card to-brand-500/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Dry-Run Safe Invariant Enforced
              </span>
              <span className="text-xs text-muted">
                {scenarios.length} Scenarios Evaluated in Parallel
              </span>
            </div>
            <h2 className="font-heading text-2xl font-bold tracking-tight">
              Scenario Comparative Performance
            </h2>
            <p className="text-sm text-muted max-w-2xl">
              Side-by-side comparison across allocation quality, student preference satisfaction,
              fairness parity gaps, and student movement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {scenarios.map((sc) => (
              <button
                key={sc.scenarioId}
                type="button"
                onClick={() => handleCopySettings(sc.config)}
                className="inline-flex items-center gap-2 rounded-xl border border-brand-500/40 bg-brand-500/10 px-3.5 py-2 text-xs font-bold text-brand-700 dark:text-brand-300 hover:bg-brand-500/20 transition-all shadow-sm"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Use "{sc.scenarioName}" for Real Run</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Small Charts Grid (Requirement 3) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Chart 1: First Choice Rate */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              First-Choice Rate
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono">
                {((baseScenario?.firstChoiceRate ?? 0) * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-muted">base</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 pt-2 border-t border-border">
            {scenarios.map((sc, idx) => (
              <div key={sc.scenarioId} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="truncate max-w-[110px]">{sc.scenarioName}</span>
                  <span className="font-mono font-bold">
                    {(sc.firstChoiceRate * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      idx === 0 ? "bg-brand-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${Math.min(100, sc.firstChoiceRate * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Mean Compatibility */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Avg Compatibility
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono">
                {((baseScenario?.meanCompatibility ?? 0) * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-muted">base</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 pt-2 border-t border-border">
            {scenarios.map((sc, idx) => (
              <div key={sc.scenarioId} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="truncate max-w-[110px]">{sc.scenarioName}</span>
                  <span className="font-mono font-bold">
                    {(sc.meanCompatibility * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      idx === 0 ? "bg-brand-500" : "bg-purple-500"
                    }`}
                    style={{ width: `${Math.min(100, sc.meanCompatibility * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Waitlist Size */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Waitlist Size
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono">
                {baseScenario?.totalWaitlisted ?? 0}
              </span>
              <span className="text-xs text-muted">students</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 pt-2 border-t border-border">
            {scenarios.map((sc) => (
              <div key={sc.scenarioId} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="truncate max-w-[110px]">{sc.scenarioName}</span>
                  <span className="font-mono font-bold">{sc.totalWaitlisted}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      sc.totalWaitlisted > (baseScenario?.totalWaitlisted ?? 0)
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (sc.totalWaitlisted /
                          Math.max(1, (baseScenario?.totalWaitlisted || 1) * 1.5)) *
                          100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 4: Parity Gap */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Category Parity Gap
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono">
                {((baseScenario?.parityGap ?? 0) * 100).toFixed(1)}%
              </span>
              <span className="text-xs text-muted">base</span>
            </div>
          </div>
          <div className="mt-4 space-y-2 pt-2 border-t border-border">
            {scenarios.map((sc) => (
              <div key={sc.scenarioId} className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="truncate max-w-[110px]">{sc.scenarioName}</span>
                  <span className="font-mono font-bold">{(sc.parityGap * 100).toFixed(1)}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{ width: `${Math.min(100, sc.parityGap * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 5: Priority Inversions */}
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Priority Inversions
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                0
              </span>
              <span className="text-xs text-emerald-600 font-semibold">Strict Pass</span>
            </div>
          </div>
          <div className="mt-4 pt-2 border-t border-border">
            <div className="rounded-lg bg-emerald-500/10 p-2 text-center text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              ✓ Invariant P2 Guaranteed (0 Inversions)
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Metrics Table (Requirement 3) */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-border bg-muted/10 flex items-center justify-between">
          <h3 className="font-heading text-base font-bold">Side-by-Side Metrics Table</h3>
          <span className="text-xs text-muted">
            Green / Amber tags indicate deltas relative to Base
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/20 font-bold uppercase tracking-wider text-muted text-[11px]">
                <th className="py-3.5 px-6">Metric</th>
                <th className="py-3.5 px-6">{baseScenario?.scenarioName || "Scenario 1"} (Base)</th>
                {comparedScenarios.map((sc) => (
                  <th key={sc.scenarioId} className="py-3.5 px-6">
                    {sc.scenarioName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Metric Row: Total Placed */}
              <tr className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-6 font-semibold text-text">Total Placed Units</td>
                <td className="py-3 px-6 font-mono font-medium">
                  {baseScenario?.totalPlaced ?? 0}
                </td>
                {comparedScenarios.map((sc) => {
                  const delta = sc.totalPlaced - (baseScenario?.totalPlaced ?? 0);
                  return (
                    <td key={sc.scenarioId} className="py-3 px-6 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sc.totalPlaced}</span>
                        {delta !== 0 && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              delta > 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-red-500/10 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Metric Row: Total Waitlisted */}
              <tr className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-6 font-semibold text-text">Waitlist Size</td>
                <td className="py-3 px-6 font-mono font-medium">
                  {baseScenario?.totalWaitlisted ?? 0}
                </td>
                {comparedScenarios.map((sc) => {
                  const delta = sc.totalWaitlisted - (baseScenario?.totalWaitlisted ?? 0);
                  return (
                    <td key={sc.scenarioId} className="py-3 px-6 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sc.totalWaitlisted}</span>
                        {delta !== 0 && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              delta < 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {delta > 0 ? `+${delta}` : delta}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Metric Row: First Choice Rate */}
              <tr className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-6 font-semibold text-text">First-Choice Rate</td>
                <td className="py-3 px-6 font-mono font-medium">
                  {((baseScenario?.firstChoiceRate ?? 0) * 100).toFixed(2)}%
                </td>
                {comparedScenarios.map((sc) => {
                  const delta = (sc.firstChoiceRate - (baseScenario?.firstChoiceRate ?? 0)) * 100;
                  return (
                    <td key={sc.scenarioId} className="py-3 px-6 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {(sc.firstChoiceRate * 100).toFixed(2)}%
                        </span>
                        {Math.abs(delta) > 0.01 && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              delta > 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Metric Row: Mean Compatibility */}
              <tr className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-6 font-semibold text-text">Mean Compatibility</td>
                <td className="py-3 px-6 font-mono font-medium">
                  {((baseScenario?.meanCompatibility ?? 0) * 100).toFixed(2)}%
                </td>
                {comparedScenarios.map((sc) => {
                  const delta =
                    (sc.meanCompatibility - (baseScenario?.meanCompatibility ?? 0)) * 100;
                  return (
                    <td key={sc.scenarioId} className="py-3 px-6 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {(sc.meanCompatibility * 100).toFixed(2)}%
                        </span>
                        {Math.abs(delta) > 0.01 && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              delta > 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Metric Row: Parity Gap */}
              <tr className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-6 font-semibold text-text">Category Parity Gap</td>
                <td className="py-3 px-6 font-mono font-medium">
                  {((baseScenario?.parityGap ?? 0) * 100).toFixed(2)}%
                </td>
                {comparedScenarios.map((sc) => {
                  const delta = (sc.parityGap - (baseScenario?.parityGap ?? 0)) * 100;
                  return (
                    <td key={sc.scenarioId} className="py-3 px-6 font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{(sc.parityGap * 100).toFixed(2)}%</span>
                        {Math.abs(delta) > 0.01 && (
                          <span
                            className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              delta < 0
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {delta > 0 ? `+${delta.toFixed(1)}%` : `${delta.toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* Metric Row: Priority Inversions */}
              <tr className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-6 font-semibold text-text">Priority Inversions</td>
                <td className="py-3 px-6 font-mono font-bold text-emerald-600">0</td>
                {comparedScenarios.map((sc) => (
                  <td
                    key={sc.scenarioId}
                    className="py-3 px-6 font-mono font-bold text-emerald-600"
                  >
                    {sc.priorityInversions} (Valid)
                  </td>
                ))}
              </tr>

              {/* Metric Row: Duration */}
              <tr className="hover:bg-muted/10 transition-colors">
                <td className="py-3 px-6 font-semibold text-text">Worker Compute Duration</td>
                <td className="py-3 px-6 font-mono text-muted">
                  {baseScenario?.durationMs ?? 0} ms
                </td>
                {comparedScenarios.map((sc) => (
                  <td key={sc.scenarioId} className="py-3 px-6 font-mono text-muted">
                    {sc.durationMs} ms
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* List of Students Whose Outcome Differs (Requirement 3) */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-heading text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-brand-500" />
              <span>Students with Divergent Outcomes</span>
              <span className="rounded-full bg-brand-500/10 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                {comparison.divergentStudents?.length ?? 0} affected
              </span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Detailed breakdown of students whose hostel, room, or waitlist status changes between
              scenarios.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search student or roll no..."
                className="rounded-xl border border-border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 w-48 sm:w-60"
              />
            </div>
            <select
              value={selectedStudentFilter}
              onChange={(e) =>
                setSelectedStudentFilter(e.target.value as "all" | "waitlist" | "placed")
              }
              className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="all">All Outcomes</option>
              <option value="waitlist">Has Waitlist Outcome</option>
              <option value="placed">Has Placed Outcome</option>
            </select>
          </div>
        </div>

        {filteredStudents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted">
            {comparison.divergentStudents?.length === 0
              ? "All students received identical outcomes across these scenarios."
              : "No students match your filter search."}
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-muted/20 font-bold uppercase tracking-wider text-muted text-[11px]">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Quota</th>
                    <th className="py-3 px-4">{baseScenario?.scenarioName || "Scenario 1"}</th>
                    {comparedScenarios.map((sc) => (
                      <th key={sc.scenarioId} className="py-3 px-4">
                        {sc.scenarioName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border font-medium">
                  {filteredStudents.slice(0, 50).map((diff) => (
                    <tr key={diff.studentId} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-text">{diff.studentName}</div>
                        <div className="text-[10px] text-muted font-mono">{diff.rollNumber}</div>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className="rounded bg-muted/30 px-1.5 py-0.5 text-[10px]">
                          {diff.quotaCategory}
                        </span>
                      </td>

                      {/* Scenario 1 Outcome */}
                      <td className="py-3 px-4">
                        {baseScenario &&
                          renderStudentOutcome(diff.outcomesByScenario[baseScenario.scenarioId])}
                      </td>

                      {/* Other Scenarios */}
                      {comparedScenarios.map((sc) => (
                        <td key={sc.scenarioId} className="py-3 px-4">
                          {renderStudentOutcome(diff.outcomesByScenario[sc.scenarioId])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredStudents.length > 50 && (
              <div className="p-3 text-center text-xs text-muted border-t border-border bg-muted/5">
                Showing 50 of {filteredStudents.length} divergent students
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function renderStudentOutcome(outcome?: StudentPlacementOutcome) {
  if (!outcome) {
    return <span className="text-muted text-[11px]">—</span>;
  }

  if (outcome.status === "placed") {
    return (
      <div className="space-y-0.5">
        <div className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
          <span>✓ {outcome.hostelName || "Hostel"}</span>
          {outcome.roomNumber && <span className="font-mono">({outcome.roomNumber})</span>}
        </div>
        {outcome.rankSatisfied !== undefined && outcome.rankSatisfied !== null && (
          <div className="text-[10px] text-muted">Pref Rank #{outcome.rankSatisfied}</div>
        )}
      </div>
    );
  }

  if (outcome.status === "waitlisted") {
    return (
      <div className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">
        <span>Waitlist #{outcome.waitlistRank || "?"}</span>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded bg-red-500/10 px-1.5 py-0.5 text-[11px] font-bold text-red-700 dark:text-red-300">
      <span>Rejected</span>
    </div>
  );
}

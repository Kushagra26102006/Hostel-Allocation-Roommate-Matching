/**
 * @hostelhub/domain — 8,000 x 8,000 Allocation Benchmark
 *
 * Requirements:
 * - Loads the synthetic dataset (8,000 applicants, 8,000 beds).
 * - Runs the engine 5 times with different seeds.
 * - Prints wall time per stage, total time, peak memory, and metrics.
 * - Fails with a non-zero exit code if any run exceeds 600 seconds.
 * - Design goal: under 120 seconds.
 */

import { performance } from "node:perf_hooks";
import os from "node:os";
import { buildSyntheticDataset } from "../packages/domain/src/allocation/syntheticSnapshot.ts";
import { allocate } from "../packages/domain/src/allocation/pipeline.ts";

const SEEDS = [42, 101, 777, 1337, 9999];
const TIME_LIMIT_SECONDS = 600;
const DESIGN_GOAL_SECONDS = 120;

function formatBytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatSec(sec: number): string {
  return `${sec.toFixed(3)}s`;
}

interface RunSummary {
  run: number;
  seed: number;
  stageTimes: Record<string, number>;
  totalTimeSec: number;
  peakHeapUsedMB: number;
  assigned: number;
  unassigned: number;
  rejected: number;
  fillRate: number;
  firstChoiceRate: number;
  avgRankSatisfied: number;
  giniPreferenceScore: number;
  categoryParityGap: number;
  priorityInversions: number;
  meanRoomCompatibility: number;
}

async function main() {
  console.log("================================================================================");
  console.log("             HOSTELHUB DETERMINISTIC ALLOCATION ENGINE BENCHMARK                ");
  console.log("================================================================================");
  console.log(`Machine:   ${os.cpus()[0]?.model ?? "Unknown CPU"} (${os.cpus().length} cores)`);
  console.log(`OS:        ${os.type()} ${os.release()} (${os.arch()})`);
  console.log(`Node:      ${process.version}`);
  console.log(`Workload:  8,000 applicants x 8,000 beds across 5 independent seeds`);
  console.log(
    `Threshold: Fail if any run > ${TIME_LIMIT_SECONDS}s (Target: < ${DESIGN_GOAL_SECONDS}s)`,
  );
  console.log("--------------------------------------------------------------------------------\n");

  console.log("Generating synthetic dataset (8,000 applicants, 8,000 beds)...");
  const datasetStart = performance.now();
  const { snapshot, units } = buildSyntheticDataset({
    applicants: 8000,
    beds: 8000,
    seed: 42,
  });
  const datasetDuration = (performance.now() - datasetStart) / 1000;
  console.log(`Synthetic dataset generated in ${formatSec(datasetDuration)}.\n`);

  const summaries: RunSummary[] = [];

  for (let runIdx = 0; runIdx < SEEDS.length; runIdx++) {
    const seed = SEEDS[runIdx]!;
    console.log(`>>> [Run ${runIdx + 1}/5] Seed: ${seed}`);

    const stageStartTimes: Record<string, number> = {};
    const stageTimes: Record<string, number> = {};
    let lastSeenStage: string | null = null;
    let peakHeap = process.memoryUsage().heapUsed;

    const runStart = performance.now();

    const result = allocate(
      snapshot,
      units,
      {
        seed,
        maxIterations: 500,
        onProgress: (stage, current, total) => {
          const heapNow = process.memoryUsage().heapUsed;
          if (heapNow > peakHeap) peakHeap = heapNow;

          if (stage !== lastSeenStage) {
            if (lastSeenStage && stageTimes[lastSeenStage] === undefined) {
              const start = stageStartTimes[lastSeenStage] ?? runStart;
              stageTimes[lastSeenStage] = (performance.now() - start) / 1000;
            }
            stageStartTimes[stage] = performance.now();
            lastSeenStage = stage;
          }

          if (current === total) {
            const start = stageStartTimes[stage] ?? runStart;
            stageTimes[stage] = (performance.now() - start) / 1000;
          }
        },
      },
      runStart,
    );

    if (lastSeenStage && stageTimes[lastSeenStage] === undefined) {
      const start = stageStartTimes[lastSeenStage] ?? runStart;
      stageTimes[lastSeenStage] = (performance.now() - start) / 1000;
    }

    const totalTimeSec = (performance.now() - runStart) / 1000;
    const peakHeapUsedMB = peakHeap / (1024 * 1024);
    const m = result.metrics;
    const fillRate = result.assignments.length / snapshot.beds.size;

    console.log("  Stage Breakdown:");
    for (const [stage, timeSec] of Object.entries(stageTimes)) {
      console.log(`    - ${stage.padEnd(14)}: ${formatSec(timeSec)}`);
    }
    console.log(`  Total Run Time:   ${formatSec(totalTimeSec)}`);
    console.log(`  Peak Heap Used:   ${formatBytes(peakHeap)}`);
    console.log(`  Engine Metrics:`);
    console.log(`    - Assigned Units:        ${m.assigned} / ${units.length}`);
    console.log(`    - Unassigned / Waitlist: ${m.unassigned}`);
    console.log(`    - Rejected Units:        ${m.rejected}`);
    console.log(`    - Bed Fill Rate:         ${(fillRate * 100).toFixed(2)}%`);
    console.log(`    - 1st Choice Rate:       ${(m.firstChoiceRate * 100).toFixed(2)}%`);
    console.log(`    - Avg Rank Satisfied:    ${m.avgRankSatisfied.toFixed(2)}`);
    console.log(`    - Gini Preference Score: ${m.giniPreferenceScore.toFixed(4)}`);
    console.log(`    - Category Parity Gap:   ${(m.categoryParityGap * 100).toFixed(2)}%`);
    console.log(`    - Priority Inversions:   ${m.priorityInversions}`);
    console.log(`    - Mean Room Compat:      ${(m.meanRoomCompatibility * 100).toFixed(2)}%`);
    console.log();

    summaries.push({
      run: runIdx + 1,
      seed,
      stageTimes,
      totalTimeSec,
      peakHeapUsedMB,
      assigned: m.assigned,
      unassigned: m.unassigned,
      rejected: m.rejected,
      fillRate,
      firstChoiceRate: m.firstChoiceRate,
      avgRankSatisfied: m.avgRankSatisfied,
      giniPreferenceScore: m.giniPreferenceScore,
      categoryParityGap: m.categoryParityGap,
      priorityInversions: m.priorityInversions,
      meanRoomCompatibility: m.meanRoomCompatibility,
    });

    if (totalTimeSec > TIME_LIMIT_SECONDS) {
      console.error(
        `FAIL: Run ${runIdx + 1} (seed ${seed}) took ${formatSec(totalTimeSec)}, exceeding threshold of ${TIME_LIMIT_SECONDS}s!`,
      );
      process.exit(1);
    }
  }

  // Final Summary Table
  console.log("================================================================================");
  console.log("                            BENCHMARK SUMMARY RESULTS                           ");
  console.log("================================================================================");
  console.log(
    "Run | Seed  | Total (s) | Peak Mem (MB) | Assigned | Waitlist | Rejected | Fill Rate | Status",
  );
  console.log(
    "----+-------+-----------+---------------+----------+----------+----------+-----------+--------",
  );

  let sumTime = 0;
  let maxTime = 0;
  let minTime = Infinity;

  for (const s of summaries) {
    sumTime += s.totalTimeSec;
    if (s.totalTimeSec > maxTime) maxTime = s.totalTimeSec;
    if (s.totalTimeSec < minTime) minTime = s.totalTimeSec;

    const status = s.totalTimeSec <= DESIGN_GOAL_SECONDS ? "PASS (FAST)" : "PASS";
    console.log(
      ` ${s.run}  | ${s.seed.toString().padEnd(5)} | ${s.totalTimeSec.toFixed(3).padStart(9)} | ${s.peakHeapUsedMB.toFixed(1).padStart(13)} | ${s.assigned.toString().padStart(8)} | ${s.unassigned.toString().padStart(8)} | ${s.rejected.toString().padStart(8)} | ${(s.fillRate * 100).toFixed(1).padStart(8)}% | ${status}`,
    );
  }

  const avgTime = sumTime / summaries.length;
  console.log(
    "----+-------+-----------+---------------+----------+----------+----------+-----------+--------",
  );
  console.log(
    `Avg |   -   | ${avgTime.toFixed(3).padStart(9)} |               |          |          |          |           | ${avgTime <= DESIGN_GOAL_SECONDS ? "PASS (FAST)" : "PASS"}`,
  );
  console.log(
    `Min: ${formatSec(minTime)} | Max: ${formatSec(maxTime)} | Mean: ${formatSec(avgTime)} (Design Goal: < ${DESIGN_GOAL_SECONDS}s)`,
  );
  console.log("================================================================================");
}

main().catch((err) => {
  console.error("Benchmark failed with error:", err);
  process.exit(1);
});

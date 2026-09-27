"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ProgressRing } from "@/components/ui/progress-ring";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import { PlayCircle, Terminal, Cpu, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";

const PIPELINE_STAGES = [
  { id: "snapshot", name: "Snapshot", desc: "Immutable snapshot of student & room rosters" },
  { id: "eligibility", name: "Eligibility", desc: "Policy AST validation & quota partitioning" },
  {
    id: "ranking",
    name: "Ranking",
    desc: "Deterministic Gale-Shapley preference priority ordering",
  },
  { id: "assignment", name: "Assignment", desc: "Bipartite deferred-acceptance core matching" },
  { id: "improvement", name: "Improvement", desc: "Mutual roommate group Pareto-improvement pass" },
  {
    id: "validation",
    name: "Validation",
    desc: "Mathematical invariant verification & zero inversion check",
  },
  { id: "draft", name: "Draft", desc: "Cryptographic SHA-256 draft commit for warden review" },
];

export default function AdminAllocationConsolePage() {
  const [runId] = React.useState("RUN-2026-F1-089");
  const [seed, setSeed] = React.useState("421098");
  const [rulesVersion] = React.useState("v3.2.0 (Senate-2026)");
  const [weightsVersion, setWeightsVersion] = React.useState("w-2.4 (Gale-Shapley Core)");
  const [engineVersion] = React.useState("v2.10.4-deterministic");
  const [isDryRun, setIsDryRun] = React.useState(false);
  const [isRunning, setIsRunning] = React.useState(false);
  const [currentStageIdx, setCurrentStageIdx] = React.useState(6); // Draft completed
  const [runtime, setRuntime] = React.useState("14.2s");

  const [logs, setLogs] = React.useState<
    Array<{ timestamp: string; level: "info" | "success" | "warn" | "error"; message: string }>
  >([
    {
      timestamp: "14:32:01",
      level: "info",
      message: "Engine initialized with PCG32 deterministic PRNG seed: 421098",
    },
    {
      timestamp: "14:32:03",
      level: "info",
      message: "Snapshot Stage: Ingested 1,970 beds and 2,040 verified applicants",
    },
    {
      timestamp: "14:32:05",
      level: "info",
      message: "Eligibility Stage: Evaluated 14 institutional policy rules with zero syntax errors",
    },
    {
      timestamp: "14:32:08",
      level: "info",
      message: "Ranking Stage: Gale-Shapley applicant preference matrix populated",
    },
    {
      timestamp: "14:32:11",
      level: "info",
      message: "Assignment Stage: 1,850 students provisionally matched into residence rooms",
    },
    {
      timestamp: "14:32:13",
      level: "info",
      message: "Improvement Stage: Roommate consent pairs verified; 42 Pareto swaps executed",
    },
    {
      timestamp: "14:32:14",
      level: "success",
      message:
        "Validation Stage: 0 priority inversions detected. 100% gender cohort match confirmed",
    },
    {
      timestamp: "14:32:15",
      level: "success",
      message: "Draft Stage: Draft #draft-fall-2026-v1 committed with hash 0x7c49e2...890a",
    },
  ]);

  const terminalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const handleStartRun = () => {
    setIsRunning(true);
    setCurrentStageIdx(0);
    setRuntime("0.0s");
    const startTime = Date.now();
    setLogs([
      {
        timestamp: new Date().toLocaleTimeString(),
        level: "info",
        message: `Initializing engine run ${runId} with seed ${seed}...`,
      },
    ]);

    const interval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      setRuntime(`${elapsed}s`);

      setCurrentStageIdx((prev) => {
        if (prev < PIPELINE_STAGES.length - 1) {
          const next = prev + 1;
          setLogs((l) => [
            ...l,
            {
              timestamp: new Date().toLocaleTimeString(),
              level: next === PIPELINE_STAGES.length - 1 ? "success" : "info",
              message: `Stage [${PIPELINE_STAGES[next]?.name ?? "Stage"}]: ${PIPELINE_STAGES[next]?.desc ?? ""}`,
            },
          ]);
          return next;
        } else {
          clearInterval(interval);
          setIsRunning(false);
          toast.success(
            "Deterministic allocation completed! Draft created with 0 priority inversions.",
          );
          return prev;
        }
      });
    }, 900);
  };

  const progressPercent = Math.round(((currentStageIdx + 1) / PIPELINE_STAGES.length) * 100);

  return (
    <FadeIn className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* 1. Header with Run ID, Status, and Controls */}
      <FadeUp className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <Cpu className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
            <span>Deterministic Gale-Shapley Matching Engine</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
            Allocation Run Console
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Execute university allocation pipelines with SSE streaming, mathematical invariant
            checks, and draft staging.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            size="lg"
            onClick={handleStartRun}
            disabled={isRunning}
            className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-md shadow-brand-500/20"
          >
            {isRunning ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-spin" />
                Executing Pipeline...
              </>
            ) : (
              <>
                <PlayCircle className="mr-2 h-5 w-5" />
                Start Allocation Run
              </>
            )}
          </Button>
        </div>
      </FadeUp>

      {/* 2. Operations Header Metadata Bar */}
      <FadeUp delay={0.05}>
        <GlassCard className="p-4 bg-surface-muted/30 border-border/70">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-7 text-xs">
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Run Identifier
              </span>
              <span className="font-mono font-bold text-foreground mt-0.5 block">{runId}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Engine Status
              </span>
              <span
                className={`font-semibold mt-0.5 block ${isRunning ? "text-brand-600 animate-pulse" : "text-emerald-600"}`}
              >
                {isRunning ? "● Executing" : "● Ready / Draft Synced"}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                PRNG Seed
              </span>
              <span className="font-mono font-semibold text-foreground mt-0.5 block">{seed}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Rules Version
              </span>
              <span className="font-semibold text-foreground mt-0.5 block truncate">
                {rulesVersion}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Weights Version
              </span>
              <span className="font-semibold text-foreground mt-0.5 block truncate">
                {weightsVersion}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Engine Core
              </span>
              <span className="font-mono text-muted-foreground mt-0.5 block truncate">
                {engineVersion}
              </span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">
                Last Runtime
              </span>
              <span className="font-mono font-bold text-foreground mt-0.5 block">{runtime}</span>
            </div>
          </div>
        </GlassCard>
      </FadeUp>

      {/* 3. Main Split: Parameters & Large Stage Visualizer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Parameters & Timeline (7 cols) */}
        <FadeUp delay={0.1} className="space-y-6 lg:col-span-7">
          <GlassCard className="p-6 space-y-5">
            <h3 className="font-heading text-base font-bold text-foreground">
              Pipeline Execution Parameters
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="seed" className="text-xs font-bold text-foreground">
                  PRNG Seed (PCG32 Deterministic)
                </Label>
                <Input
                  id="seed"
                  value={seed}
                  disabled={isRunning}
                  onChange={(e) => setSeed(e.target.value)}
                  className="mt-1.5 font-mono text-xs rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="weights" className="text-xs font-bold text-foreground">
                  Weight Version Profile
                </Label>
                <Input
                  id="weights"
                  value={weightsVersion}
                  disabled={isRunning}
                  onChange={(e) => setWeightsVersion(e.target.value)}
                  className="mt-1.5 font-mono text-xs rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-3.5 border border-border/40">
              <div>
                <div className="text-xs font-bold text-foreground">Dry-Run Simulation Mode</div>
                <div className="text-[11px] text-muted-foreground">
                  Test algorithm output without generating draft for warden review
                </div>
              </div>
              <Switch checked={isDryRun} onCheckedChange={setIsDryRun} disabled={isRunning} />
            </div>

            {/* Stages Stepper */}
            <div className="pt-2">
              <span className="text-xs font-bold text-foreground block mb-2.5">
                Pipeline Stage Progression:
              </span>
              <div className="space-y-2">
                {PIPELINE_STAGES.map((stg, i) => {
                  const isCurrent = i === currentStageIdx;
                  const isPassed = i < currentStageIdx;
                  return (
                    <div
                      key={stg.id}
                      className={`flex items-center justify-between rounded-xl p-3 border transition-all ${
                        isCurrent
                          ? "border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300"
                          : isPassed
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "border-border/40 bg-surface-muted/30 text-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                            isCurrent
                              ? "bg-brand-500 text-white"
                              : isPassed
                                ? "bg-emerald-500 text-white"
                                : "bg-surface-muted text-muted-foreground"
                          }`}
                        >
                          {isPassed ? "✓" : i + 1}
                        </div>
                        <div>
                          <div className="font-bold text-xs">{stg.name}</div>
                          <div className="text-[11px] opacity-80">{stg.desc}</div>
                        </div>
                      </div>

                      <div className="text-[11px] font-mono font-semibold">
                        {isCurrent
                          ? isRunning
                            ? "Processing..."
                            : "Current"
                          : isPassed
                            ? "Completed"
                            : "Pending"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </FadeUp>

        {/* Live Progress Ring & Metrics (5 cols) */}
        <FadeUp delay={0.15} className="space-y-6 lg:col-span-5">
          <GlassCard className="p-6 flex flex-col items-center justify-center text-center">
            <h4 className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Overall Pipeline Completion
            </h4>
            <ProgressRing
              value={progressPercent}
              size={140}
              strokeWidth={12}
              sublabel={PIPELINE_STAGES[currentStageIdx]?.name || "Finished"}
            />

            <div className="mt-6 grid grid-cols-3 gap-2.5 w-full text-xs">
              <div className="rounded-xl bg-surface-muted/60 p-3 border border-border/40">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Allocated
                </span>
                <div className="font-bold text-foreground text-sm mt-0.5">1,850</div>
              </div>
              <div className="rounded-xl bg-surface-muted/60 p-3 border border-border/40">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Waitlisted
                </span>
                <div className="font-bold text-amber-600 dark:text-amber-400 text-sm mt-0.5">
                  120
                </div>
              </div>
              <div className="rounded-xl bg-surface-muted/60 p-3 border border-border/40">
                <span className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Runtime
                </span>
                <div className="font-mono font-bold text-foreground text-sm mt-0.5">{runtime}</div>
              </div>
            </div>
          </GlassCard>

          {/* Mathematical Invariants Card */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <h4 className="font-heading text-sm font-bold text-foreground">
                Post-Run Invariant Verification
              </h4>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
                <span className="text-muted-foreground">Single Bed Capacity (P1):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  0 Overlaps ✓
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
                <span className="text-muted-foreground">Gender Cohorts (P2):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  100% Match ✓
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface-muted/50 p-2.5 border border-border/40">
                <span className="text-muted-foreground">Priority Inversions (P3):</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  0 Inversions ✓
                </span>
              </div>
            </div>
          </GlassCard>
        </FadeUp>
      </div>

      {/* 4. Live SSE Event Stream Logs Terminal */}
      <FadeUp delay={0.2}>
        <GlassCard className="p-6 bg-surface-muted/30 border-border/70 text-foreground">
          <div className="flex items-center justify-between pb-3 border-b border-border/60">
            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <Terminal className="h-4 w-4 text-brand-600 dark:text-brand-400" />
              <span className="font-bold text-foreground">Live SSE Allocation Event Stream</span>
              <span>(/api/v1/runs/{runId}/events)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>SSE Connected</span>
            </div>
          </div>

          <div
            ref={terminalRef}
            className="mt-3 space-y-2 font-mono text-xs h-44 overflow-y-auto pr-2 rounded-xl bg-background/80 p-3.5 border border-border/60"
          >
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-muted-foreground shrink-0">[{log.timestamp}]</span>
                <span
                  className={
                    log.level === "error"
                      ? "text-red-500 font-bold"
                      : log.level === "success"
                        ? "text-emerald-600 dark:text-emerald-400 font-semibold"
                        : "text-foreground"
                  }
                >
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </FadeUp>
    </FadeIn>
  );
}

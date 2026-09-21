"use client";

import React, { useState, useEffect } from "react";
import { Sliders, History, Sparkles, RefreshCw, Plus } from "lucide-react";
import {
  ScenarioBuilderModal,
  type ScenarioOptionData,
} from "@/components/simulator/scenario-builder-modal";
import { ComparisonView } from "@/components/simulator/comparison-view";
import type { ScenarioComparison, SimulationResult, ScenarioDefinition } from "@hostelhub/domain";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export default function SimulatorPage() {
  const searchParams = useSearchParams();
  const initialBatchId = searchParams.get("batchId");

  const [options, setOptions] = useState<ScenarioOptionData | null>(null);
  const [isLoadingOptions, setIsLoadingOptions] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Active simulation results
  const [comparison, setComparison] = useState<ScenarioComparison | null>(null);
  const [scenarios, setScenarios] = useState<SimulationResult[] | null>(null);
  const [activeBatchId, setActiveBatchId] = useState<string | null>(initialBatchId);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);

  // Past batches history
  const [recentBatches, setRecentBatches] = useState<
    Array<{
      id: string;
      cycleId: string;
      seed: number;
      scenarioCount: number;
      createdAt: string;
      scenarios?: Array<{ scenarioId: string; name: string }>;
    }>
  >([]);

  // 1. Fetch scenario options
  const fetchOptions = async () => {
    try {
      setIsLoadingOptions(true);
      const res = await fetch("/api/v1/simulations/options");
      if (res.ok) {
        const data = await res.json();
        setOptions(data);
      }
    } catch {
      toast.error("Failed to load scenario options.");
    } finally {
      setIsLoadingOptions(false);
    }
  };

  // 2. Fetch past batches list
  const fetchBatches = async () => {
    try {
      const res = await fetch("/api/v1/simulations?limit=10");
      if (res.ok) {
        const data = await res.json();
        setRecentBatches(data.batches || []);
      }
    } catch {
      // ignore
    }
  };

  // 3. Fetch specific batch details
  const loadBatch = async (batchId: string) => {
    try {
      setIsLoadingBatch(true);
      const res = await fetch(`/api/v1/simulations/${batchId}`);
      if (!res.ok) {
        throw new Error("Batch not found");
      }
      const data = await res.json();
      setComparison(data.comparison);
      setScenarios(data.scenarios);
      setActiveBatchId(batchId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load simulation batch.";
      toast.error(msg);
    } finally {
      setIsLoadingBatch(false);
    }
  };

  useEffect(() => {
    fetchOptions();
    fetchBatches();
    if (initialBatchId) {
      loadBatch(initialBatchId);
    }
  }, [initialBatchId]);

  // Execute simulation batch
  const handleRunSimulation = async (params: {
    cycleId: string;
    baseRunId?: string;
    seed: number;
    scenarios: ScenarioDefinition[];
  }) => {
    try {
      toast.loading("Simulating scenarios in parallel...", { id: "sim-run" });
      const res = await fetch("/api/v1/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Simulation run failed");
      }

      const data = await res.json();
      toast.success(`Simulation of ${params.scenarios.length} scenarios completed successfully!`, {
        id: "sim-run",
      });

      setComparison(data.comparison);
      setScenarios(data.scenarios);
      setActiveBatchId(data.batchId);
      fetchBatches();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Simulation execution failed.";
      toast.error(msg, { id: "sim-run" });
      throw err;
    }
  };

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300 mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Policy Exploration Sandbox · Dry-Run Invariant</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            What-If Allocation Simulator
          </h1>
          <p className="mt-1 text-sm text-muted">
            Safely simulate and compare up to 3 allocation scenarios in parallel with identical
            seeds before publishing real drafts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Simulation Batch</span>
          </button>
        </div>
      </div>

      {/* Recent Batches Quick Selector */}
      {recentBatches.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-muted">
            <History className="h-4 w-4" />
            <span className="font-semibold">Recent Simulation Batches:</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
            {recentBatches.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => loadBatch(b.id)}
                className={`rounded-lg px-3 py-1.5 font-medium transition-all shrink-0 ${
                  activeBatchId === b.id
                    ? "bg-brand-600 text-white font-bold"
                    : "border border-border bg-background hover:bg-muted/20 text-text"
                }`}
              >
                <span>{b.scenarioCount} Scenarios</span>
                <span className="ml-1.5 opacity-70 font-mono">
                  {new Date(b.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoadingBatch ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted animate-pulse">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-brand-500" />
          <p className="text-sm font-semibold">Loading simulation batch comparison...</p>
        </div>
      ) : comparison && scenarios ? (
        <ComparisonView comparison={comparison} scenarios={scenarios} />
      ) : (
        /* Empty State / Welcome Screen */
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
            <Sliders className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-heading text-xl font-bold">No Active Simulation Comparison</h3>
            <p className="text-sm text-muted max-w-md mx-auto">
              Launch a what-if experiment to evaluate how changing weights, quotas, or closing
              blocks alters student satisfaction and fairness.
            </p>
          </div>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-500 transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Configure & Run Scenarios</span>
            </button>
          </div>

          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            <div className="rounded-xl border border-border bg-background p-4 space-y-1">
              <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
                1. Safe Dry-Runs
              </span>
              <p className="text-xs text-muted">
                Dry-run drafts cannot be approved or published by database constraint.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 space-y-1">
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                2. Identical Seed
              </span>
              <p className="text-xs text-muted">
                Deterministic PRNG seed guarantees identical conditions across all scenarios.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background p-4 space-y-1">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                3. Real Run Copy
              </span>
              <p className="text-xs text-muted">
                Copy winning parameters into the Run Console form with one click.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scenario Builder Modal */}
      <ScenarioBuilderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onRunSimulation={handleRunSimulation}
        options={options}
        isLoadingOptions={isLoadingOptions}
      />
    </div>
  );
}

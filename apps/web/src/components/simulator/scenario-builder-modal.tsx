"use client";

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Play,
  Plus,
  Calendar,
  Building,
  Scale,
  ShieldCheck,
  RefreshCw,
  X,
  Layers,
} from "lucide-react";
import type { ScenarioDefinition, Weights } from "@hostelhub/domain";

export interface ScenarioOptionData {
  cycleId: string;
  cycleName: string;
  hostels: Array<{ id: string; name: string }>;
  blocks: Array<{ id: string; name: string; hostelId: string }>;
  quotaBuckets: Array<{ name: string; capacity: number }>;
  weightsVersions: Array<{ id: string; name: string; version: string }>;
}

interface ScenarioBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRunSimulation: (params: {
    cycleId: string;
    baseRunId?: string;
    seed: number;
    scenarios: ScenarioDefinition[];
  }) => Promise<void>;
  options: ScenarioOptionData | null;
  isLoadingOptions: boolean;
}

const DEFAULT_WEIGHTS: Weights = {
  wP: 0.45,
  wC: 0.3,
  wF: 0.1,
  wD: 0.1,
  wK: 0.05,
};

const DEFAULT_SCENARIO: ScenarioDefinition = {
  id: "scenario-1",
  name: "Baseline Policy",
  description: "Default weights and full capacity without block closures",
  weightsVersion: "standard",
  customWeights: { ...DEFAULT_WEIGHTS },
  quotaOverrides: {},
  capacityOverrides: { closedBlockIds: [], closedHostelIds: [] },
};

export function ScenarioBuilderModal({
  isOpen,
  onClose,
  onRunSimulation,
  options,
  isLoadingOptions,
}: ScenarioBuilderModalProps) {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [seed, setSeed] = useState<number>(() => Math.floor(Math.random() * 1000000) + 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Scenarios state: 1 to 3 scenarios
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([
    {
      id: "scenario-1",
      name: "Baseline Policy",
      description: "Default weights and full capacity without block closures",
      weightsVersion: "standard",
      customWeights: { ...DEFAULT_WEIGHTS },
      quotaOverrides: {},
      capacityOverrides: { closedBlockIds: [], closedHostelIds: [] },
    },
    {
      id: "scenario-2",
      name: "Renovation Scenario",
      description: "Close one academic block for maintenance",
      weightsVersion: "standard",
      customWeights: { ...DEFAULT_WEIGHTS },
      quotaOverrides: {},
      capacityOverrides: { closedBlockIds: [], closedHostelIds: [] },
    },
  ]);

  // Sync initial quota buckets when options arrive
  useEffect(() => {
    if (options?.quotaBuckets?.length) {
      setScenarios((prev) =>
        prev.map((sc) => {
          if (Object.keys(sc.quotaOverrides || {}).length === 0) {
            const initialQuotas: Record<string, number> = {};
            options.quotaBuckets.forEach((qb) => {
              initialQuotas[qb.name] = qb.capacity;
            });
            return { ...sc, quotaOverrides: initialQuotas };
          }
          return sc;
        }),
      );
    }
  }, [options]);

  if (!isOpen) return null;

  const current: ScenarioDefinition =
    scenarios[activeScenarioIdx] ?? scenarios[0] ?? DEFAULT_SCENARIO;

  const updateCurrentScenario = (updates: Partial<ScenarioDefinition>) => {
    setScenarios((prev) => {
      const next = [...prev];
      const target = next[activeScenarioIdx] ?? DEFAULT_SCENARIO;
      next[activeScenarioIdx] = { ...target, ...updates } as ScenarioDefinition;
      return next;
    });
  };

  const addScenario = () => {
    if (scenarios.length >= 3) return;
    const newIdx = scenarios.length + 1;
    const newSc: ScenarioDefinition = {
      id: `scenario-${newIdx}`,
      name: `Scenario ${String.fromCharCode(64 + newIdx)}`,
      description: "Alternative parameter adjustment",
      weightsVersion: "standard",
      customWeights: { ...DEFAULT_WEIGHTS },
      quotaOverrides: { ...(current.quotaOverrides || {}) },
      capacityOverrides: { closedBlockIds: [], closedHostelIds: [] },
    };
    setScenarios([...scenarios, newSc]);
    setActiveScenarioIdx(scenarios.length);
  };

  const removeScenario = (idx: number) => {
    if (scenarios.length <= 1) return;
    const updated = scenarios.filter((_, i) => i !== idx);
    setScenarios(updated);
    setActiveScenarioIdx(Math.max(0, idx - 1));
  };

  const handleRandomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 1000000) + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!options?.cycleId) return;
    try {
      setIsSubmitting(true);
      await onRunSimulation({
        cycleId: options.cycleId,
        seed,
        scenarios,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleBlockClosure = (blockId: string) => {
    const existing = current.capacityOverrides?.closedBlockIds || [];
    const updated = existing.includes(blockId)
      ? existing.filter((id) => id !== blockId)
      : [...existing, blockId];
    updateCurrentScenario({
      capacityOverrides: {
        ...(current.capacityOverrides || {}),
        closedBlockIds: updated,
      },
    });
  };

  const toggleHostelClosure = (hostelId: string) => {
    const existing = current.capacityOverrides?.closedHostelIds || [];
    const updated = existing.includes(hostelId)
      ? existing.filter((id) => id !== hostelId)
      : [...existing, hostelId];
    updateCurrentScenario({
      capacityOverrides: {
        ...(current.capacityOverrides || {}),
        closedHostelIds: updated,
      },
    });
  };

  const handleQuotaChange = (bucketName: string, val: number) => {
    updateCurrentScenario({
      quotaOverrides: {
        ...(current.quotaOverrides || {}),
        [bucketName]: Math.max(0, val),
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-card text-text shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-muted/20">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600/10 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold">What-If Scenario Builder</h2>
              <p className="text-xs text-muted">
                Cycle:{" "}
                <span className="font-medium text-text">{options?.cycleName || "Loading..."}</span>{" "}
                · Dry-Run Invariant Enforced
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted hover:bg-muted/30 hover:text-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Seed and parallel execution banner */}
          <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-brand-600 dark:text-brand-400 shrink-0" />
              <div>
                <h4 className="text-sm font-semibold">Deterministic Parallel Worker Execution</h4>
                <p className="text-xs text-muted">
                  All {scenarios.length} scenarios execute in parallel using the exact same PRNG
                  seed for invariant safety.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted">Seed:</span>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(parseInt(e.target.value, 10) || 1)}
                className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={handleRandomizeSeed}
                title="Generate new random seed"
                className="rounded-lg border border-border bg-background p-1.5 text-muted hover:text-text transition-colors"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Scenario Tabs */}
          <div className="flex items-center justify-between border-b border-border pb-2">
            <div className="flex items-center gap-2">
              {scenarios.map((sc, idx) => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setActiveScenarioIdx(idx)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
                    activeScenarioIdx === idx
                      ? "bg-brand-600 text-white shadow-sm"
                      : "bg-muted/30 text-muted hover:bg-muted/60 hover:text-text"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>{sc.name || `Scenario ${idx + 1}`}</span>
                  {scenarios.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        removeScenario(idx);
                      }}
                      className="ml-1 hover:text-red-300 p-0.5"
                    >
                      ×
                    </span>
                  )}
                </button>
              ))}
              {scenarios.length < 3 && (
                <button
                  type="button"
                  onClick={addScenario}
                  className="flex items-center gap-1.5 rounded-xl border border-dashed border-border px-3 py-2 text-xs font-semibold text-muted hover:border-brand-500 hover:text-brand-500 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Scenario ({scenarios.length}/3)</span>
                </button>
              )}
            </div>
          </div>

          {/* Current Scenario Form */}
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Scenario Name
                </label>
                <input
                  type="text"
                  value={current.name}
                  onChange={(e) => updateCurrentScenario({ name: e.target.value })}
                  placeholder="e.g. Close Gargi Block 1"
                  required
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                  Weights Version / Preset
                </label>
                <select
                  value={current.weightsVersion || "standard"}
                  onChange={(e) => updateCurrentScenario({ weightsVersion: e.target.value })}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="standard">Standard Default (wP: 0.45, wC: 0.30)</option>
                  <option value="preference_first">Preference-Heavy (wP: 0.60, wC: 0.20)</option>
                  <option value="compatibility_first">
                    High Compatibility (wP: 0.35, wC: 0.45)
                  </option>
                  {options?.weightsVersions?.map((wv) => (
                    <option key={wv.id} value={wv.version}>
                      {wv.name} ({wv.version})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
                Description / Rationale
              </label>
              <input
                type="text"
                value={current.description || ""}
                onChange={(e) => updateCurrentScenario({ description: e.target.value })}
                placeholder="Brief notes explaining this what-if scenario..."
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-text focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            {/* Section: Capacity Overrides (Close Blocks or Hostels) */}
            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Building className="h-4 w-4 text-brand-500" />
                <span>Capacity Overrides (Physical Availability)</span>
              </div>
              <p className="text-xs text-muted">
                Close entire hostels or individual blocks for renovation or quarantine. Beds inside
                closed blocks are excluded without modifying live database records.
              </p>

              {options?.hostels && options.hostels.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-semibold text-muted">Hostels:</span>
                  <div className="flex flex-wrap gap-2">
                    {options.hostels.map((hostel) => {
                      const isClosed = current.capacityOverrides?.closedHostelIds?.includes(
                        hostel.id,
                      );
                      return (
                        <label
                          key={hostel.id}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition-all ${
                            isClosed
                              ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400 font-bold"
                              : "border-border bg-card text-text hover:bg-muted/20"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isClosed || false}
                            onChange={() => toggleHostelClosure(hostel.id)}
                            className="rounded border-border text-red-600 focus:ring-red-500 h-3.5 w-3.5"
                          />
                          <span>
                            {hostel.name}
                            {isClosed ? " (Closed)" : ""}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted">Individual Blocks:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {options?.blocks?.map((block) => {
                    const isClosed = current.capacityOverrides?.closedBlockIds?.includes(block.id);
                    return (
                      <label
                        key={block.id}
                        className={`flex items-center gap-2 rounded-lg border p-2.5 text-xs font-medium cursor-pointer transition-all ${
                          isClosed
                            ? "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400 font-bold"
                            : "border-border bg-card text-text hover:bg-muted/20"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isClosed || false}
                          onChange={() => toggleBlockClosure(block.id)}
                          className="rounded border-border text-red-600 focus:ring-red-500 h-4 w-4"
                        />
                        <span className="truncate">
                          {block.name}
                          {isClosed ? " (Closed)" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section: Quota Bucket Overrides */}
            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Scale className="h-4 w-4 text-amber-500" />
                <span>Quota Seat Counts Overrides</span>
              </div>
              <p className="text-xs text-muted">
                Adjust allocated seats per category bucket to test fairness parity gaps and waitlist
                spillover.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
                {options?.quotaBuckets?.map((qb) => {
                  const currentVal = current.quotaOverrides?.[qb.name] ?? qb.capacity;
                  return (
                    <div
                      key={qb.name}
                      className="rounded-lg border border-border bg-card p-2.5 space-y-1"
                    >
                      <span className="block text-xs font-semibold truncate">{qb.name}</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          value={currentVal}
                          onChange={(e) =>
                            handleQuotaChange(qb.name, parseInt(e.target.value, 10) || 0)
                          }
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs font-mono font-semibold"
                        />
                        <span className="text-[10px] text-muted">seats</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section: Accessibility Cutoff Date */}
            <div className="rounded-xl border border-border bg-muted/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Calendar className="h-4 w-4 text-emerald-500" />
                <span>Accessibility Reservation Cutoff Date</span>
              </div>
              <p className="text-xs text-muted">
                Simulate releasing unreserved accessible beds into general inventory after a
                priority deadline passes.
              </p>
              <div className="max-w-xs pt-1">
                <input
                  type="date"
                  value={current.accessibilityReservationDate || ""}
                  onChange={(e) =>
                    updateCurrentScenario({ accessibilityReservationDate: e.target.value })
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-xs font-semibold hover:bg-muted/20 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoadingOptions}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand-500 transition-all disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              <span>
                {isSubmitting
                  ? "Simulating Scenarios..."
                  : `Run ${scenarios.length} Scenarios in Parallel`}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

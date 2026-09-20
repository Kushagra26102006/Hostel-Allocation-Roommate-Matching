"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import type { AllocationStageCode } from "@hostelhub/shared";
import { STAGE_CONFIGS } from "@hostelhub/shared";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeightsVersion {
  id: string;
  versionLabel: string;
  description?: string;
  used: boolean;
}

interface AllocationFormProps {
  /** Available cycles the user may select from. */
  cycles: Array<{ id: string; name: string; status: string }>;
  /** Callback when a run is triggered. Returns the new runId. */
  onRunStarted: (runId: string) => void;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate a cryptographically random seed (positive 32-bit int). */
function generateSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  // Keep positive and within signed int32 range used by the engine
  return (buf[0]! >>> 1) | 1;
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * AllocationForm — lets hostel_admin / chief_warden trigger an allocation run.
 *
 * Fields:
 *  • Cycle selector
 *  • Seed input (JetBrains Mono, "Generate" button)
 *  • Weights version selector
 *  • Dry-run toggle
 */
export function AllocationForm({ cycles, onRunStarted, className }: AllocationFormProps) {
  const { prefersReducedMotion } = useMotionPreference();

  const [selectedCycleId, setSelectedCycleId] = React.useState(cycles[0]?.id ?? "");
  const [seed, setSeed] = React.useState<string>(() => String(generateSeed()));
  const [weightsVersions, setWeightsVersions] = React.useState<WeightsVersion[]>([]);
  const [selectedWeightsVersion, setSelectedWeightsVersion] = React.useState<string>("default");
  const [dryRun, setDryRun] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Load weights versions
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/weights-versions", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.weightsVersions) {
          setWeightsVersions(data.weightsVersions as WeightsVersion[]);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const handleGenerate = React.useCallback(() => {
    setSeed(String(generateSeed()));
  }, []);

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      setIsSubmitting(true);

      const parsedSeed = parseInt(seed, 10);
      if (isNaN(parsedSeed) || parsedSeed <= 0) {
        setError("Seed must be a positive integer.");
        setIsSubmitting(false);
        return;
      }

      try {
        const idempotencyKey = `alloc-${selectedCycleId}-${parsedSeed}-${Date.now()}`;
        const res = await fetch(`/api/v1/cycles/${selectedCycleId}/allocate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            seed: parsedSeed,
            weightsVersion:
              selectedWeightsVersion === "default" ? undefined : selectedWeightsVersion,
            dryRun,
          }),
        });

        const data = (await res.json()) as { run?: { id: string }; detail?: string };

        if (!res.ok) {
          setError(data.detail ?? `Error ${res.status}: Failed to start run.`);
          return;
        }

        if (data.run?.id) {
          onRunStarted(data.run.id);
        }
      } catch (err) {
        setError((err as Error).message ?? "Network error. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedCycleId, seed, selectedWeightsVersion, dryRun, onRunStarted],
  );

  const activeCycles = cycles.filter((c) => c.status !== "closed");

  return (
    <form
      id="allocation-form"
      onSubmit={handleSubmit}
      className={cn("space-y-5", className)}
      aria-label="Start allocation run"
    >
      {/* Cycle */}
      <div className="space-y-1.5">
        <label htmlFor="alloc-cycle" className="block text-sm font-semibold text-text">
          Allocation Cycle
        </label>
        <select
          id="alloc-cycle"
          value={selectedCycleId}
          onChange={(e) => setSelectedCycleId(e.target.value)}
          className="w-full rounded-ctrl border border-border bg-surface px-3 py-2 text-sm text-text focus-ring transition-colors"
          required
        >
          {activeCycles.length === 0 && <option value="">— No active cycles —</option>}
          {activeCycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Seed */}
      <div className="space-y-1.5">
        <label htmlFor="alloc-seed" className="block text-sm font-semibold text-text">
          Seed
          <span className="ml-1.5 text-xs font-normal text-muted">
            (determines assignment order — same seed → same result)
          </span>
        </label>
        <div className="flex gap-2">
          <input
            id="alloc-seed"
            type="number"
            min="1"
            step="1"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            className={cn(
              "flex-1 rounded-ctrl border border-border bg-surface px-3 py-2 text-sm",
              "focus-ring transition-colors",
              "font-mono tracking-tight",
            )}
            style={{ fontFamily: "var(--font-mono)" }}
            required
            aria-describedby="seed-hint"
          />
          <button
            type="button"
            id="alloc-seed-generate"
            onClick={handleGenerate}
            className={cn(
              "shrink-0 rounded-ctrl px-3 py-2 text-sm font-medium",
              "border border-border bg-surface text-text",
              "hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700",
              "focus-ring transition-colors",
              !prefersReducedMotion && "transition-all duration-180",
            )}
            aria-label="Generate random seed"
          >
            Generate
          </button>
        </div>
        <p id="seed-hint" className="text-xs text-muted">
          Positive integer up to 2,147,483,647
        </p>
      </div>

      {/* Weights Version */}
      <div className="space-y-1.5">
        <label htmlFor="alloc-weights" className="block text-sm font-semibold text-text">
          Weights Version
        </label>
        <select
          id="alloc-weights"
          value={selectedWeightsVersion}
          onChange={(e) => setSelectedWeightsVersion(e.target.value)}
          className="w-full rounded-ctrl border border-border bg-surface px-3 py-2 text-sm text-text focus-ring transition-colors"
        >
          <option value="default">Default (system weights)</option>
          {weightsVersions.map((wv) => (
            <option key={wv.id} value={wv.versionLabel} disabled={wv.used}>
              {wv.versionLabel}
              {wv.used ? " (used)" : ""}
              {wv.description ? ` — ${wv.description}` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Dry-run toggle */}
      <div className="flex items-start gap-3">
        <input
          id="alloc-dryrun"
          type="checkbox"
          checked={dryRun}
          onChange={(e) => setDryRun(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border text-brand-600 focus-ring"
        />
        <div>
          <label htmlFor="alloc-dryrun" className="block text-sm font-semibold text-text">
            Dry run
          </label>
          <p className="text-xs text-muted">
            Run the engine but do not persist a draft or assignments. Useful for previewing metrics.
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="rounded-ctrl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        id="alloc-form-submit"
        disabled={isSubmitting || activeCycles.length === 0}
        className={cn(
          "w-full rounded-ctrl px-4 py-2.5 text-sm font-semibold",
          "bg-gradient-brand text-white",
          "hover:opacity-90 focus-ring",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          !prefersReducedMotion && "transition-opacity duration-180",
        )}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <SpinIcon className="h-4 w-4 animate-spin" aria-hidden />
            Starting run…
          </span>
        ) : (
          "Run Allocation"
        )}
      </button>
    </form>
  );
}

// ─── Micro-icons ──────────────────────────────────────────────────────────────

function SpinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Stage timeline display (also used by run-progress) ──────────────────────

export const STAGE_ORDER: AllocationStageCode[] = [
  "freeze",
  "eligibility",
  "sort",
  "group",
  "assign",
  "local_search",
  "waitlist",
  "invariants",
  "persist",
];

export { STAGE_CONFIGS };

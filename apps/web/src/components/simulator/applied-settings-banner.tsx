"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, X, Sliders, Building, Scale, Calendar } from "lucide-react";
import Link from "next/link";

interface AppliedRunSettings {
  appliedFromScenario: string;
  weightsVersion?: string;
  customWeights?: Record<string, number>;
  quotaOverrides?: Record<string, number>;
  capacityOverrides?: {
    closedBlockIds?: string[];
    closedHostelIds?: string[];
  };
  accessibilityReservationDate?: string;
  timestamp: string;
}

export function AppliedSettingsBanner() {
  const [settings, setSettings] = useState<AppliedRunSettings | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("hostelhub_applied_run_settings");
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleClear = () => {
    localStorage.removeItem("hostelhub_applied_run_settings");
    setSettings(null);
  };

  if (!settings) return null;

  const closedBlocksCount = settings.capacityOverrides?.closedBlockIds?.length || 0;
  const quotaOverridesCount = Object.keys(settings.quotaOverrides || {}).length;

  return (
    <div className="rounded-2xl border border-brand-500/40 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-transparent p-4 mb-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-brand-600 p-2 text-white shadow-sm mt-0.5">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-text">
                Settings Loaded from Simulator: "{settings.appliedFromScenario}"
              </h4>
              <span className="rounded bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:text-brand-300">
                Dry-Run Safe
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              These scenario parameters are pre-populated in this console for the next production
              run. Nothing has been published yet.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
              <span className="inline-flex items-center gap-1 font-medium text-text">
                <Sliders className="h-3 w-3 text-muted" />
                Weights: {settings.weightsVersion || "Default"}
              </span>
              {closedBlocksCount > 0 && (
                <span className="inline-flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                  <Building className="h-3 w-3" />
                  {closedBlocksCount} Block(s) Closed
                </span>
              )}
              {quotaOverridesCount > 0 && (
                <span className="inline-flex items-center gap-1 font-medium text-text">
                  <Scale className="h-3 w-3 text-muted" />
                  {quotaOverridesCount} Quota Bucket(s) Adjusted
                </span>
              )}
              {settings.accessibilityReservationDate && (
                <span className="inline-flex items-center gap-1 font-medium text-text">
                  <Calendar className="h-3 w-3 text-muted" />
                  Accessibility Cutoff: {settings.accessibilityReservationDate}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <Link
            href="/staff/chief-warden/simulator"
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted/20 text-text transition-colors"
          >
            Back to Simulator
          </Link>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-1.5 text-muted hover:text-text hover:bg-muted/20 transition-colors"
            title="Clear applied settings"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

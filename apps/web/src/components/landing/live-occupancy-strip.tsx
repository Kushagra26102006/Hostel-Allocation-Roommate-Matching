"use client";

import * as React from "react";
import { Bed, CheckCircle2, AlertCircle, Building, RefreshCw, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/animated-number";
import { GlassCard } from "@/components/glass-card";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { getMessages } from "@/lib/i18n";
import type { InventoryOccupancyResponse } from "@/app/api/v1/inventory/occupancy/route";

const INITIAL_DATA: InventoryOccupancyResponse = {
  totalBeds: 1520,
  occupiedBeds: 1398,
  availableBeds: 122,
  occupancyRate: 92,
  lastUpdated: new Date().toISOString(),
  hostels: [
    {
      id: "block-a",
      name: "Aryabhata Hall (Block A)",
      total: 420,
      occupied: 395,
      available: 25,
      rate: 94,
      gender: "male",
    },
    {
      id: "block-b",
      name: "Gargi Residence (Block B)",
      total: 380,
      occupied: 358,
      available: 22,
      rate: 94,
      gender: "female",
    },
    {
      id: "block-c",
      name: "Ramanujan Tower (Block C)",
      total: 400,
      occupied: 360,
      available: 40,
      rate: 90,
      gender: "co-ed",
    },
    {
      id: "block-d",
      name: "Kalpana Chawla Hall (Block D)",
      total: 320,
      occupied: 285,
      available: 35,
      rate: 89,
      gender: "female",
    },
  ],
};

export function LiveOccupancyStrip() {
  const [data, setData] = React.useState<InventoryOccupancyResponse>(INITIAL_DATA);
  const [loading, setLoading] = React.useState(false);
  const { prefersReducedMotion } = useMotionPreference();

  const messages = getMessages();
  const copy = messages.occupancy;

  const fetchOccupancy = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/inventory/occupancy", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // Graceful fallback to initial seeded data
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchOccupancy();
  }, [fetchOccupancy]);

  // Progress ring math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.occupancyRate / 100) * circumference;

  return (
    <section
      id="live-occupancy"
      aria-labelledby="occupancy-heading"
      className="relative z-20 -mt-8 px-4 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <GlassCard
          spotlight={!prefersReducedMotion}
          className="overflow-hidden border border-border/70 bg-surface/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
        >
          {/* Header row */}
          <div className="flex flex-col justify-between gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-success">
                  {copy.lastSynced}
                </span>
              </div>
              <h2
                id="occupancy-heading"
                className="mt-1 font-heading text-xl font-bold text-text sm:text-2xl"
              >
                {copy.title}
              </h2>
              <p className="mt-0.5 text-xs text-muted sm:text-sm">{copy.subtitle}</p>
            </div>

            <button
              type="button"
              onClick={fetchOccupancy}
              disabled={loading}
              className="inline-flex items-center gap-2 self-start rounded-ctrl border border-border bg-surface/70 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin text-brand-500")}
                aria-hidden="true"
              />
              <span>Refresh data</span>
            </button>
          </div>

          {/* Metrics strip */}
          <div className="grid grid-cols-1 items-center gap-8 pt-6 sm:grid-cols-2 lg:grid-cols-12">
            {/* Progress ring + summary (lg: 4 cols) */}
            <div className="flex items-center gap-5 sm:col-span-2 lg:col-span-4">
              <div className="relative flex h-32 w-32 shrink-0 items-center justify-center">
                <svg
                  className="h-full w-full -rotate-90 transform"
                  viewBox="0 0 130 130"
                  aria-hidden="true"
                >
                  <circle
                    cx="65"
                    cy="65"
                    r={radius}
                    stroke="currentColor"
                    strokeWidth="10"
                    fill="transparent"
                    className="text-border/60"
                  />
                  <circle
                    cx="65"
                    cy="65"
                    r={radius}
                    stroke="url(#occupancy-gradient)"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="occupancy-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="hsl(var(--brand-600))" />
                      <stop offset="100%" stopColor="hsl(var(--accent))" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Center text */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <div className="font-heading text-2xl font-black text-text">
                    <AnimatedNumber to={data.occupancyRate} />%
                  </div>
                  <span className="text-[10px] font-semibold text-muted uppercase">Occupied</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-success">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Optimal distribution</span>
                </div>
                <div className="mt-1 font-heading text-lg font-bold text-text">
                  {copy.rateLabel}
                </div>
                <p className="mt-1 text-xs text-muted">
                  High efficiency allocation across all residential blocks.
                </p>
              </div>
            </div>

            {/* Stat Counters (lg: 8 cols) */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:col-span-2 lg:col-span-8">
              {/* Total beds */}
              <div className="rounded-card border border-border/60 bg-surface/50 p-4 transition-colors hover:bg-surface/80">
                <div className="flex items-center justify-between text-muted">
                  <span className="text-xs font-medium">{copy.totalBeds}</span>
                  <Bed className="h-4 w-4 text-brand-500" aria-hidden="true" />
                </div>
                <div className="mt-2 font-heading text-2xl font-bold text-text sm:text-3xl">
                  <AnimatedNumber to={data.totalBeds} />
                </div>
                <span className="text-[11px] text-muted">Campus sanctioned</span>
              </div>

              {/* Occupied beds */}
              <div className="rounded-card border border-border/60 bg-surface/50 p-4 transition-colors hover:bg-surface/80">
                <div className="flex items-center justify-between text-muted">
                  <span className="text-xs font-medium">{copy.occupiedBeds}</span>
                  <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                </div>
                <div className="mt-2 font-heading text-2xl font-bold text-success sm:text-3xl">
                  <AnimatedNumber to={data.occupiedBeds} />
                </div>
                <span className="text-[11px] text-muted">Confirmed students</span>
              </div>

              {/* Available beds */}
              <div className="rounded-card border border-border/60 bg-surface/50 p-4 transition-colors hover:bg-surface/80">
                <div className="flex items-center justify-between text-muted">
                  <span className="text-xs font-medium">{copy.availableBeds}</span>
                  <AlertCircle className="h-4 w-4 text-warning" aria-hidden="true" />
                </div>
                <div className="mt-2 font-heading text-2xl font-bold text-warning sm:text-3xl">
                  <AnimatedNumber to={data.availableBeds} />
                </div>
                <span className="text-[11px] text-muted">Open in Round 2</span>
              </div>
            </div>
          </div>

          {/* Hostels mini-breakdown pills */}
          <div className="mt-6 border-t border-border/70 pt-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Tower Breakdown
            </span>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.hostels.map((h) => (
                <div
                  key={h.id}
                  className="flex items-center justify-between rounded-xl border border-border/50 bg-surface/40 p-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-muted shrink-0" aria-hidden="true" />
                    <div>
                      <span className="font-semibold text-text">{h.name}</span>
                      <span className="block text-[10px] capitalize text-muted">
                        {h.gender} • {h.available} left
                      </span>
                    </div>
                  </div>
                  <span className="font-heading font-bold text-text">{h.rate}%</span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}

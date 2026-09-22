"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Map } from "lucide-react";

// Dynamic import to avoid SSR issues with Leaflet
const CampusMap = dynamic(
  () => import("@/components/map/campus-map").then((mod) => mod.CampusMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[600px] rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center">
        <span className="text-slate-400">Loading map...</span>
      </div>
    ),
  },
);

export default function CampusMapPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-500 flex items-center justify-center text-white shadow-sm">
            <Map className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Campus Map</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Explore hostels, academic blocks, and walking distances
            </p>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="h-[600px]">
        <CampusMap />
      </div>

      {/* Walking Distance Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="font-semibold text-sm text-emerald-700 dark:text-emerald-300">
              Nearby (≤ 8 min)
            </span>
          </div>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            Highest D-score contribution. Walking distance gives maximum proximity bonus.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span className="font-semibold text-sm text-amber-700 dark:text-amber-300">
              Moderate (9–15 min)
            </span>
          </div>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Moderate D-score. Comfortable daily commute for most academic schedules.
          </p>
        </div>
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full bg-rose-500" />
            <span className="font-semibold text-sm text-rose-700 dark:text-rose-300">
              Far (&gt; 15 min)
            </span>
          </div>
          <p className="text-xs text-rose-600 dark:text-rose-400">
            Lower D-score. Longer commute but may offer quieter surroundings.
          </p>
        </div>
      </div>
    </div>
  );
}

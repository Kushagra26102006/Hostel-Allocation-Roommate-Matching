"use client";

import * as React from "react";
import { Building2, Layers, BarChart3 } from "lucide-react";
import { InventoryManager } from "@/components/inventory/inventory-manager";
import { ImportWizard } from "@/components/inventory/import-wizard";
import { OccupancyHeatMap } from "@/components/inventory/occupancy-heatmap";

export default function AdminInventoryPage() {
  const [activeTab, setActiveTab] = React.useState<"tree" | "heatmap">("tree");
  const [isWizardOpen, setIsWizardOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider">
            <Building2 className="h-4 w-4" />
            Module M1 · Residential Operations
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Hostel & Room Inventory
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage hostels, blocks, floors, rooms, and individual bed inventory with real-time
            occupancy.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1">
          <button
            onClick={() => setActiveTab("tree")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "tree"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-4 w-4" />
            Inventory Tree
          </button>
          <button
            onClick={() => setActiveTab("heatmap")}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "heatmap"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Occupancy Heat Map
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "tree" ? (
        <InventoryManager onOpenImportWizard={() => setIsWizardOpen(true)} />
      ) : (
        <OccupancyHeatMap />
      )}

      {/* 4-Step Import Wizard Modal */}
      <ImportWizard
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        onSuccess={() => {
          // Success callback
        }}
      />
    </div>
  );
}

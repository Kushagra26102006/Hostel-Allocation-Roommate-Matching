"use client";

import React, { useState } from "react";
import { BuildingExplorer } from "@/components/explorer/building-explorer";
import { Button } from "@/components/ui/button";
import { Building2, Sparkles } from "lucide-react";

const CAMPUS_HOSTELS = [
  { id: "aryabhata", name: "Aryabhata Hall", subtitle: "Block A • Male Residence" },
  { id: "gargi", name: "Gargi Residence", subtitle: "Block B • Female Residence" },
  { id: "ramanujan", name: "Ramanujan Tower", subtitle: "Block C • Coed Research Block" },
  { id: "kalpana", name: "Kalpana Chawla Hall", subtitle: "Block D • Senior Girls Residence" },
];

export default function BuildingExplorerPage() {
  const [selectedHostel, setSelectedHostel] = useState(CAMPUS_HOSTELS[0]!);

  return (
    <div className="space-y-8 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Interactive Campus Visualization (I01)</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-heading">
            3D Hostel Building Explorer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Explore floor plans, wings, room allocations, and live bed occupancy in full 3D or
            fallback 2D schematic view.
          </p>
        </div>

        {/* Hostel Picker Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CAMPUS_HOSTELS.map((h) => {
            const isSelected = selectedHostel.id === h.id;
            return (
              <Button
                key={h.id}
                size="sm"
                variant={isSelected ? "primary" : "outline"}
                onClick={() => setSelectedHostel(h)}
                className="h-9 px-3.5 text-xs font-semibold shrink-0"
              >
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                {h.name}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Explorer Component */}
      <BuildingExplorer key={selectedHostel.id} initialHostelName={selectedHostel.name} />
    </div>
  );
}

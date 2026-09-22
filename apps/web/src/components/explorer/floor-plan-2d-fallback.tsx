"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layers, Accessibility, Wind } from "lucide-react";
import { type Building3DModel, type Room3DData, STATUS_COLORS, STATUS_LABELS } from "./types";

interface FloorPlan2DFallbackProps {
  model: Building3DModel;
  selectedRoom: Room3DData | null;
  onSelectRoom: (room: Room3DData) => void;
  activeFloorNumber?: number | null;
  onFloorChange?: (floor: number | null) => void;
  className?: string;
}

export function FloorPlan2DFallback({
  model,
  selectedRoom,
  onSelectRoom,
  activeFloorNumber,
  onFloorChange,
  className = "",
}: FloorPlan2DFallbackProps) {
  const [currentFloorNum, setCurrentFloorNum] = useState<number>(() => {
    return activeFloorNumber !== null && activeFloorNumber !== undefined
      ? activeFloorNumber
      : (model.floors[0]?.floorNumber ?? 0);
  });

  const selectedFloor =
    model.floors.find((f) => f.floorNumber === currentFloorNum) || model.floors[0];

  const handleSelectFloor = (fNum: number) => {
    setCurrentFloorNum(fNum);
    if (onFloorChange) onFloorChange(fNum);
  };

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card p-6 shadow-xl flex flex-col space-y-6 ${className}`}
      role="region"
      aria-label="2D Hostel Floor Plan"
    >
      {/* Floor Plan Header & Floor Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground font-heading">
              {model.hostelName} — 2D Floor Plan
            </h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive schematic view for {selectedFloor?.floorLabel || `Floor ${currentFloorNum}`}
            .
          </p>
        </div>

        {/* Floor Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-muted/30 rounded-xl border border-border/60">
          {model.floors.map((fl) => {
            const isActive = fl.floorNumber === currentFloorNum;
            return (
              <Button
                key={fl.floorNumber}
                size="sm"
                variant={isActive ? "primary" : "ghost"}
                onClick={() => handleSelectFloor(fl.floorNumber)}
                className="h-7 text-xs font-semibold px-3"
              >
                {fl.floorNumber === 0 ? "Ground Floor" : `Floor ${fl.floorNumber}`}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-medium py-1">
        <span className="text-muted-foreground font-semibold">Legend:</span>
        {Object.entries(STATUS_LABELS).map(([status, label]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-xs border border-black/20"
              style={{ backgroundColor: STATUS_COLORS[status as keyof typeof STATUS_COLORS] }}
            />
            <span className="text-muted-foreground text-[11px]">{label}</span>
          </div>
        ))}
      </div>

      {/* Floor Plan Diagram Canvas */}
      {selectedFloor && (
        <div className="space-y-6">
          {selectedFloor.wings.map((wing, wingIdx) => (
            <div
              key={wing.name || wingIdx}
              className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-heading">
                  {wing.name}
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {wing.rooms.length} Rooms
                </Badge>
              </div>

              {/* Corridor / Room Grid Layout */}
              <div className="relative">
                {/* Central Corridor Indicator */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-5 bg-muted/40 border-y border-dashed border-border/80 flex items-center justify-center text-[10px] text-muted-foreground font-mono uppercase tracking-widest pointer-events-none z-0">
                  Corridor / Hallway
                </div>

                {/* Rooms Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 py-6 relative z-10">
                  {wing.rooms.map((room) => {
                    const isSelected = selectedRoom?.id === room.id;
                    const statusColor = STATUS_COLORS[room.status];

                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => onSelectRoom(room)}
                        className={`group relative flex flex-col justify-between p-3 rounded-xl border text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary ${
                          isSelected
                            ? "border-primary ring-2 ring-primary/40 shadow-lg bg-card"
                            : "border-border/80 bg-card/80 hover:border-primary/50"
                        }`}
                        style={{
                          borderLeftWidth: "4px",
                          borderLeftColor: statusColor,
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-mono font-bold text-sm text-foreground">
                            {room.roomNumber}
                          </span>
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: statusColor }}
                            title={STATUS_LABELS[room.status]}
                          />
                        </div>

                        <div className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                          <div className="flex items-center justify-between font-mono">
                            <span>Beds</span>
                            <span className="font-bold text-foreground">
                              {room.occupiedCount}/{room.capacity}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 text-muted-foreground/80">
                            {room.accessible && (
                              <span title="Accessible">
                                <Accessibility className="h-3 w-3 text-emerald-500" />
                              </span>
                            )}
                            {room.ac && (
                              <span title="Air Conditioned">
                                <Wind className="h-3 w-3 text-sky-500" />
                              </span>
                            )}
                            <span className="text-[10px]">{room.roomType}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Layers, Eye } from "lucide-react";
import type { Floor3DData } from "./types";

interface FloorSlicerProps {
  floors: Floor3DData[];
  selectedFloor: number | null; // null = all floors shown
  onFloorChange: (floor: number | null) => void;
  className?: string;
}

export function FloorSlicer({
  floors,
  selectedFloor,
  onFloorChange,
  className = "",
}: FloorSlicerProps) {
  const minFloor = floors[0]?.floorNumber ?? 0;
  const maxFloor = floors[floors.length - 1]?.floorNumber ?? 3;

  // Slicer value: maxFloor + 1 represents "All Floors"
  const sliderValue = selectedFloor === null ? maxFloor + 1 : selectedFloor;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (val > maxFloor) {
      onFloorChange(null); // All floors
    } else {
      onFloorChange(val);
    }
  };

  return (
    <div
      className={`rounded-xl border border-border/80 bg-card/90 backdrop-blur-md p-3 shadow-lg ${className}`}
      role="region"
      aria-label="Building Floor Slicer"
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" />
          <span>Floor Slicing Control</span>
        </div>
        <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
          {selectedFloor === null
            ? "Full Building View"
            : selectedFloor === 0
              ? "Ground Floor Cutaway"
              : `Floor ${selectedFloor} Cutaway`}
        </span>
      </div>

      {/* Slider */}
      <div className="space-y-1.5 py-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
          <span>Gnd</span>
          <span>
            {selectedFloor === null
              ? "Showing All Floors (Roof On)"
              : `Slicing down to Level ${selectedFloor}`}
          </span>
          <span>All</span>
        </div>
        <div className="relative flex items-center">
          <input
            type="range"
            min={minFloor}
            max={maxFloor + 1}
            step={1}
            value={sliderValue}
            onChange={handleSliderChange}
            aria-label="Floor cutaway slider"
            aria-valuemin={minFloor}
            aria-valuemax={maxFloor + 1}
            aria-valuenow={sliderValue}
            aria-valuetext={
              selectedFloor === null ? "All floors visible" : `Floor ${selectedFloor} cutaway`
            }
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>

      {/* Quick Floor Selection Buttons */}
      <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto pb-0.5">
        <Button
          size="sm"
          variant={selectedFloor === null ? "primary" : "outline"}
          onClick={() => onFloorChange(null)}
          className="h-7 px-2.5 text-xs font-medium shrink-0"
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          All Floors
        </Button>
        {floors.map((floor) => {
          const isSelected = selectedFloor === floor.floorNumber;
          return (
            <Button
              key={floor.floorNumber}
              size="sm"
              variant={isSelected ? "primary" : "outline"}
              onClick={() => onFloorChange(floor.floorNumber)}
              className="h-7 px-2.5 text-xs font-medium shrink-0 font-mono"
            >
              {floor.floorNumber === 0 ? "Gnd" : `F${floor.floorNumber}`}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

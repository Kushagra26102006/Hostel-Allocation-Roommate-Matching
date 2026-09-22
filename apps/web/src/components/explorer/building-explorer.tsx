"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Box, Map, Loader2, SlidersHorizontal, Info, List } from "lucide-react";
import { type Building3DModel, type Room3DData } from "./types";
import { generateSampleHostelModel } from "./building-generator";
import { FloorSlicer } from "./floor-slicer";
import { RoomDetailsPanel } from "./room-details-panel";
import { AccessibleRoomList } from "./accessible-room-list";
import { FloorPlan2DFallback } from "./floor-plan-2d-fallback";

// Dynamically import the Three.js / R3F Canvas strictly on-demand to protect page LCP
const DynamicBuildingExplorerCanvas = dynamic(
  () => import("./building-explorer-canvas").then((mod) => mod.BuildingExplorerCanvas),
  {
    ssr: false,
    loading: () => <CanvasLoadingSkeleton />,
  },
);

function CanvasLoadingSkeleton() {
  return (
    <div className="w-full h-full min-h-[550px] flex flex-col items-center justify-center bg-slate-950/80 rounded-2xl border border-border/80 text-slate-300 gap-3 p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <div className="text-center space-y-1">
        <p className="text-sm font-bold text-foreground">Loading 3D Spatial Engine...</p>
        <p className="text-xs text-muted-foreground">
          Procedurally extruding inventory rooms and instancing geometry.
        </p>
      </div>
    </div>
  );
}

export interface BuildingExplorerProps {
  initialHostelId?: string;
  initialHostelName?: string;
  hostelData?: Building3DModel;
  className?: string;
}

export function BuildingExplorer({
  initialHostelId,
  initialHostelName = "Aryabhata Hall",
  hostelData,
  className = "",
}: BuildingExplorerProps) {
  // 1. WebGL & Reduced Motion detection
  const [hasWebGL, setHasWebGL] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"3d" | "2d">("3d");

  // 2. Building Model State
  const [model, setModel] = useState<Building3DModel>(() => {
    return hostelData || generateSampleHostelModel(initialHostelName);
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 3. Selection & Slicing State
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room3DData | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<Room3DData | null>(null);
  const [showAccessibleList, setShowAccessibleList] = useState<boolean>(false);

  // Check WebGL and Reduced Motion on Mount
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      if (!gl) {
        setHasWebGL(false);
        setViewMode("2d");
      }
    } catch {
      setHasWebGL(false);
      setViewMode("2d");
    }

    const motionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionMedia.matches) {
      setPrefersReducedMotion(true);
      setViewMode("2d");
    }
  }, []);

  // Fetch real inventory if hostelId is specified
  useEffect(() => {
    if (initialHostelId && !hostelData) {
      setIsLoading(true);
      fetch(`/api/v1/inventory/explorer/${initialHostelId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.model) {
            setModel(data.model);
          }
        })
        .catch(() => {
          // Keep sample model on network error
        })
        .finally(() => setIsLoading(false));
    }
  }, [initialHostelId, hostelData]);

  return (
    <div className={`space-y-6 max-w-7xl mx-auto ${className}`}>
      {/* Explorer Top Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Box className="h-3.5 w-3.5" />
              <span>3D Building Explorer (I01)</span>
            </span>
            {prefersReducedMotion && (
              <Badge variant="secondary" className="text-[10px]">
                Reduced Motion Active
              </Badge>
            )}
            {!hasWebGL && (
              <Badge variant="destructive" className="text-[10px]">
                WebGL Unavailable
              </Badge>
            )}
            {isLoading && (
              <Badge variant="outline" className="text-[10px] gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
                Updating Model...
              </Badge>
            )}
          </div>
          <h2 className="text-2xl font-black tracking-tight text-foreground font-heading mt-1">
            {model.hostelName} Explorer
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {model.totalRooms} Rooms • {model.totalBeds} Total Beds • {model.occupiedBeds} Occupied
            ({model.overallOccupancyRate}% Occupancy)
          </p>
        </div>

        {/* View Controls & Toggles */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showAccessibleList ? "primary" : "outline"}
            onClick={() => setShowAccessibleList(!showAccessibleList)}
            className="h-8 text-xs font-semibold"
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            {showAccessibleList ? "Hide List" : "Accessible List"}
          </Button>

          {hasWebGL && (
            <div className="flex items-center rounded-lg border border-border/80 bg-muted/40 p-0.5">
              <Button
                size="sm"
                variant={viewMode === "3d" ? "primary" : "ghost"}
                onClick={() => setViewMode("3d")}
                className="h-7 text-xs px-3 font-semibold"
              >
                <Box className="h-3.5 w-3.5 mr-1" />
                3D View
              </Button>
              <Button
                size="sm"
                variant={viewMode === "2d" ? "primary" : "ghost"}
                onClick={() => setViewMode("2d")}
                className="h-7 text-xs px-3 font-semibold"
              >
                <Map className="h-3.5 w-3.5 mr-1" />
                2D Floor Plan
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Exploration Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: 3D Canvas OR 2D Fallback */}
        <div className="lg:col-span-8 space-y-4">
          {viewMode === "3d" && hasWebGL ? (
            <div className="relative">
              <DynamicBuildingExplorerCanvas
                model={model}
                selectedFloor={selectedFloor}
                selectedRoom={selectedRoom}
                onSelectRoom={(room) => setSelectedRoom(room)}
                hoveredRoom={hoveredRoom}
                onHoverRoom={(room) => setHoveredRoom(room)}
              />

              {/* Floor Slicing Overlay */}
              <div className="absolute top-4 right-4 z-10 w-72">
                <FloorSlicer
                  floors={model.floors}
                  selectedFloor={selectedFloor}
                  onFloorChange={(fl) => setSelectedFloor(fl)}
                />
              </div>
            </div>
          ) : (
            <FloorPlan2DFallback
              model={model}
              selectedRoom={selectedRoom}
              onSelectRoom={(room) => setSelectedRoom(room)}
              activeFloorNumber={selectedFloor}
              onFloorChange={(fl) => setSelectedFloor(fl)}
            />
          )}

          {/* Accessible List View when toggled */}
          {showAccessibleList && (
            <AccessibleRoomList
              model={model}
              selectedRoom={selectedRoom}
              onSelectRoom={(room) => setSelectedRoom(room)}
              filteredFloor={selectedFloor}
            />
          )}
        </div>

        {/* Right: Room Details Panel & Context Information */}
        <div className="lg:col-span-4 space-y-4">
          {selectedRoom ? (
            <RoomDetailsPanel
              room={selectedRoom}
              onClose={() => setSelectedRoom(null)}
              onFocusRoom={(room) => {
                // Focus camera in 3D
                setSelectedRoom({ ...room });
                if (viewMode !== "3d" && hasWebGL) setViewMode("3d");
              }}
              onSwitchTo2D={(floor) => {
                setSelectedFloor(floor);
                setViewMode("2d");
              }}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center space-y-3 bg-muted/20">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-foreground text-sm">No Room Selected</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Click any 3D room box in the building model or select a room from the directory to
                inspect bed allocations, amenities, and occupancy.
              </p>
            </div>
          )}

          {/* Slicing Quick Info Card */}
          <div className="p-4 rounded-xl border border-border/60 bg-muted/20 text-xs space-y-2">
            <div className="flex items-center gap-1.5 font-bold text-foreground">
              <Info className="h-4 w-4 text-primary" />
              <span>Building Slice & Visibility</span>
            </div>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Use the floor slicer in the top right to cut away upper floors and inspect lower
              corridor layouts. Each room is colored according to live occupancy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

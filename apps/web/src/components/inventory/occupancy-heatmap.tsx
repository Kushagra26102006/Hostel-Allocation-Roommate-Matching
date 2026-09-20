"use client";

import * as React from "react";
import { DoorClosed } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeatMapRoom {
  id: string;
  room_number: string;
  room_type: string;
  capacity: number;
  ac: boolean;
  accessible: boolean;
  status: string;
  totalBeds: number;
  occupiedBeds: number;
  heldBeds: number;
}

export interface HeatMapBlock {
  id: string;
  name: string;
  floor_no: number;
  rooms: HeatMapRoom[];
}

interface OccupancyHeatMapProps {
  blocks?: HeatMapBlock[];
  className?: string;
}

export function OccupancyHeatMap({ blocks = getSampleHeatMapBlocks(), className }: OccupancyHeatMapProps) {
  const [selectedRoom, setSelectedRoom] = React.useState<HeatMapRoom | null>(null);

  return (
    <div className={cn("flex flex-col gap-5 rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm backdrop-blur-md", className)}>
      {/* Header & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <DoorClosed className="h-4 w-4 text-primary" />
            Occupancy Heat Map
          </h3>
          <p className="text-xs text-muted-foreground">
            Room fill levels and availability across blocks and floors.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-xs border border-emerald-500 bg-emerald-500/20" />
            <span className="text-muted-foreground">0% Empty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-xs border border-amber-500 bg-amber-500/40" />
            <span className="text-muted-foreground">Partial Fill</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-xs border border-sky-500 bg-sky-500/80" />
            <span className="text-muted-foreground">100% Full</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="h-3 w-3 rounded-xs border border-rose-500"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #f43f5e 0, #f43f5e 2px, transparent 2px, transparent 4px)",
              }}
            />
            <span className="text-muted-foreground">Maintenance</span>
          </div>
        </div>
      </div>

      {/* Grid of Blocks & Floors */}
      <div className="flex flex-col gap-6">
        {blocks.map((block) => (
          <div key={block.id} className="flex flex-col gap-2.5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {block.name} — Floor {block.floor_no} ({block.rooms.length} Rooms)
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
              {block.rooms.map((room) => {
                const fillRatio =
                  room.capacity > 0 ? room.occupiedBeds / room.capacity : 0;
                const fillPercent = Math.round(fillRatio * 100);
                const isFull = fillPercent >= 100;
                const isEmpty = room.occupiedBeds === 0;
                const isMaintenance = room.status === "maintenance";

                return (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "group relative flex flex-col items-center justify-center rounded-lg border p-2 text-center transition-all hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary",
                      isEmpty && "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                      !isEmpty && !isFull && !isMaintenance && "border-amber-500/40 bg-amber-500/20 text-amber-700 dark:text-amber-300",
                      isFull && !isMaintenance && "border-sky-500/40 bg-sky-500/30 text-sky-700 dark:text-sky-300",
                      isMaintenance && "border-rose-500/40 text-rose-700 dark:text-rose-300",
                    )}
                    style={
                      isMaintenance
                        ? {
                            backgroundImage:
                              "repeating-linear-gradient(45deg, rgba(244,63,94,0.15) 0, rgba(244,63,94,0.15) 4px, transparent 4px, transparent 8px)",
                          }
                        : undefined
                    }
                  >
                    <span className="text-xs font-bold leading-none">
                      {room.room_number}
                    </span>
                    <span className="mt-1 text-[10px] opacity-75 leading-none">
                      {room.occupiedBeds}/{room.capacity}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Popover / Details Modal for selected room */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h4 className="text-base font-bold text-foreground">
                  Room {selectedRoom.room_number}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {selectedRoom.room_type} · Capacity: {selectedRoom.capacity}
                </p>
              </div>
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Occupancy Fill:</span>
                <span className="font-bold text-foreground">
                  {Math.round((selectedRoom.occupiedBeds / selectedRoom.capacity) * 100)}% ({selectedRoom.occupiedBeds}/{selectedRoom.capacity})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Air Conditioning:</span>
                <span className="font-medium text-foreground">
                  {selectedRoom.ac ? "AC Enabled" : "Non-AC"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Accessible:</span>
                <span className="font-medium text-foreground">
                  {selectedRoom.accessible ? "Wheelchair Accessible" : "Standard"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium capitalize text-foreground">
                  {selectedRoom.status}
                </span>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedRoom(null)}
                className="rounded-lg bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getSampleHeatMapBlocks(): HeatMapBlock[] {
  return [
    {
      id: "block-a-1",
      name: "Block A (Aryabhata)",
      floor_no: 1,
      rooms: [
        { id: "r101", room_number: "101", room_type: "double", capacity: 2, ac: true, accessible: true, status: "available", totalBeds: 2, occupiedBeds: 1, heldBeds: 0 },
        { id: "r102", room_number: "102", room_type: "single", capacity: 1, ac: false, accessible: false, status: "available", totalBeds: 1, occupiedBeds: 1, heldBeds: 0 },
        { id: "r103", room_number: "103", room_type: "double", capacity: 2, ac: true, accessible: false, status: "available", totalBeds: 2, occupiedBeds: 0, heldBeds: 0 },
        { id: "r104", room_number: "104", room_type: "triple", capacity: 3, ac: false, accessible: false, status: "available", totalBeds: 3, occupiedBeds: 2, heldBeds: 0 },
        { id: "r105", room_number: "105", room_type: "double", capacity: 2, ac: true, accessible: false, status: "maintenance", totalBeds: 2, occupiedBeds: 0, heldBeds: 0 },
        { id: "r106", room_number: "106", room_type: "single", capacity: 1, ac: false, accessible: false, status: "available", totalBeds: 1, occupiedBeds: 0, heldBeds: 0 },
        { id: "r107", room_number: "107", room_type: "double", capacity: 2, ac: false, accessible: false, status: "available", totalBeds: 2, occupiedBeds: 2, heldBeds: 0 },
        { id: "r108", room_number: "108", room_type: "double", capacity: 2, ac: true, accessible: false, status: "available", totalBeds: 2, occupiedBeds: 1, heldBeds: 1 },
      ],
    },
    {
      id: "block-a-2",
      name: "Block A (Aryabhata)",
      floor_no: 2,
      rooms: [
        { id: "r201", room_number: "201", room_type: "double", capacity: 2, ac: true, accessible: false, status: "available", totalBeds: 2, occupiedBeds: 2, heldBeds: 0 },
        { id: "r202", room_number: "202", room_type: "single", capacity: 1, ac: false, accessible: false, status: "available", totalBeds: 1, occupiedBeds: 0, heldBeds: 0 },
        { id: "r203", room_number: "203", room_type: "double", capacity: 2, ac: false, accessible: false, status: "available", totalBeds: 2, occupiedBeds: 1, heldBeds: 0 },
        { id: "r204", room_number: "204", room_type: "double", capacity: 2, ac: true, accessible: false, status: "maintenance", totalBeds: 2, occupiedBeds: 0, heldBeds: 0 },
        { id: "r205", room_number: "205", room_type: "triple", capacity: 3, ac: false, accessible: false, status: "available", totalBeds: 3, occupiedBeds: 3, heldBeds: 0 },
      ],
    },
  ];
}

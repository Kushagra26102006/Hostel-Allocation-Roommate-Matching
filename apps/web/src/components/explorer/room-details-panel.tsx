"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DoorClosed,
  Users,
  Accessibility,
  Wind,
  Bed,
  CheckCircle2,
  AlertCircle,
  X,
  Crosshair,
  Map,
} from "lucide-react";
import { type Room3DData, STATUS_COLORS, STATUS_LABELS } from "./types";

interface RoomDetailsPanelProps {
  room: Room3DData | null;
  onClose: () => void;
  onFocusRoom?: (room: Room3DData) => void;
  onSwitchTo2D?: (floorNumber: number) => void;
  className?: string;
}

export function RoomDetailsPanel({
  room,
  onClose,
  onFocusRoom,
  onSwitchTo2D,
  className = "",
}: RoomDetailsPanelProps) {
  if (!room) return null;

  const occupancyPercent =
    room.capacity > 0 ? Math.round((room.occupiedCount / room.capacity) * 100) : 0;
  const statusColor = STATUS_COLORS[room.status];
  const statusLabel = STATUS_LABELS[room.status];

  return (
    <div
      className={`rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl p-5 shadow-2xl transition-all flex flex-col justify-between max-h-[85vh] overflow-y-auto ${className}`}
      role="dialog"
      aria-label={`Details for Room ${room.roomNumber}`}
    >
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-tight text-foreground font-heading">
                Room {room.roomNumber}
              </span>
              <span
                className="w-3 h-3 rounded-full shrink-0 shadow-xs"
                style={{ backgroundColor: statusColor }}
                title={statusLabel}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              {room.wing} • {room.floor === 0 ? "Ground Floor" : `Floor ${room.floor}`}
            </p>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
            aria-label="Close room details panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status & Capacity Badge */}
        <div className="mt-4 p-3 rounded-xl bg-muted/40 border border-border/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Occupancy Status</span>
            <Badge
              variant="outline"
              className="text-xs font-bold capitalize"
              style={{
                borderColor: `${statusColor}60`,
                backgroundColor: `${statusColor}15`,
                color: statusColor,
              }}
            >
              {statusLabel}
            </Badge>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">Beds Filled</span>
              <span className="font-bold text-foreground">
                {room.occupiedCount} / {room.capacity} ({occupancyPercent}%)
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${occupancyPercent}%`,
                  backgroundColor: statusColor,
                }}
              />
            </div>
          </div>
        </div>

        {/* Specifications & Amenities */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg border bg-card/60 flex items-center gap-2">
            <DoorClosed className="h-4 w-4 text-primary shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Room Type</span>
              <span className="font-semibold text-foreground">{room.roomType}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border bg-card/60 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary shrink-0" />
            <div>
              <span className="text-[10px] text-muted-foreground block">Total Capacity</span>
              <span className="font-semibold text-foreground">{room.capacity} Students</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border bg-card/60 flex items-center gap-2">
            <Accessibility
              className={`h-4 w-4 shrink-0 ${room.accessible ? "text-emerald-500" : "text-muted-foreground/40"}`}
            />
            <div>
              <span className="text-[10px] text-muted-foreground block">Accessibility</span>
              <span className="font-semibold text-foreground">
                {room.accessible ? "Wheelchair Accessible" : "Standard Entry"}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg border bg-card/60 flex items-center gap-2">
            <Wind
              className={`h-4 w-4 shrink-0 ${room.ac ? "text-sky-500" : "text-muted-foreground/40"}`}
            />
            <div>
              <span className="text-[10px] text-muted-foreground block">Climate Control</span>
              <span className="font-semibold text-foreground">
                {room.ac ? "Air Conditioned" : "Natural Ventilation"}
              </span>
            </div>
          </div>
        </div>

        {/* Bed Breakdown List */}
        <div className="mt-5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Bed className="h-3.5 w-3.5" />
            <span>Bed Inventory Allocation</span>
          </h4>
          <div className="space-y-1.5">
            {room.beds.map((bed, idx) => {
              const isOccupied = bed.status === "occupied";
              return (
                <div
                  key={bed.id || idx}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-muted/20 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground font-mono">{bed.bedNumber}</span>
                    {isOccupied ? (
                      <span className="text-muted-foreground">
                        {bed.studentName || "Assigned Student"}
                        {bed.rollNumber && (
                          <span className="text-[10px] font-mono text-muted-foreground/80 block">
                            {bed.rollNumber}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Vacant / Ready for Allotment
                      </span>
                    )}
                  </div>
                  <div className="shrink-0">
                    {isOccupied ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Allocated
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        <AlertCircle className="h-3 w-3" />
                        Available
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-5 pt-3 border-t border-border/60 flex items-center gap-2">
        {onFocusRoom && (
          <Button
            size="sm"
            onClick={() => onFocusRoom(room)}
            className="flex-1 font-semibold text-xs bg-primary hover:bg-primary/90"
          >
            <Crosshair className="h-3.5 w-3.5 mr-1.5" />
            Focus Camera in 3D
          </Button>
        )}
        {onSwitchTo2D && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSwitchTo2D(room.floor)}
            className="font-medium text-xs shrink-0"
          >
            <Map className="h-3.5 w-3.5 mr-1" />
            2D Plan
          </Button>
        )}
      </div>
    </div>
  );
}

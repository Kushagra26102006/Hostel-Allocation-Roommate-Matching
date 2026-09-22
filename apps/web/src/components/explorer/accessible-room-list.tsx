"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, ChevronRight, Check } from "lucide-react";
import { type Building3DModel, type Room3DData, STATUS_COLORS, STATUS_LABELS } from "./types";

interface AccessibleRoomListProps {
  model: Building3DModel;
  selectedRoom: Room3DData | null;
  onSelectRoom: (room: Room3DData) => void;
  filteredFloor: number | null;
  className?: string;
}

export function AccessibleRoomList({
  model,
  selectedRoom,
  onSelectRoom,
  filteredFloor,
  className = "",
}: AccessibleRoomListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // Flatten rooms according to floor filter and search
  const visibleRooms: Room3DData[] = React.useMemo(() => {
    const list: Room3DData[] = [];
    const query = searchQuery.trim().toLowerCase();

    for (const floor of model.floors) {
      if (filteredFloor !== null && floor.floorNumber !== filteredFloor) {
        continue;
      }
      for (const wing of floor.wings) {
        for (const room of wing.rooms) {
          if (
            !query ||
            room.roomNumber.toLowerCase().includes(query) ||
            room.wing.toLowerCase().includes(query) ||
            room.roomType.toLowerCase().includes(query) ||
            STATUS_LABELS[room.status].toLowerCase().includes(query)
          ) {
            list.push(room);
          }
        }
      }
    }
    return list;
  }, [model, filteredFloor, searchQuery]);

  // Update announcement whenever selectedRoom changes
  useEffect(() => {
    if (selectedRoom) {
      setAnnouncement(
        `Selected Room ${selectedRoom.roomNumber}, Floor ${selectedRoom.floor}, ${selectedRoom.wing}, ${selectedRoom.roomType} room, ${selectedRoom.occupiedCount} of ${selectedRoom.capacity} beds occupied, status ${STATUS_LABELS[selectedRoom.status]}.`,
      );
    }
  }, [selectedRoom]);

  // Keyboard navigation through the listbox
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.min(visibleRooms.length - 1, index + 1);
      const nextBtn = listRef.current?.querySelector<HTMLButtonElement>(
        `[data-index="${nextIdx}"]`,
      );
      nextBtn?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = Math.max(0, index - 1);
      const prevBtn = listRef.current?.querySelector<HTMLButtonElement>(
        `[data-index="${prevIdx}"]`,
      );
      prevBtn?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const room = visibleRooms[index];
      if (room) onSelectRoom(room);
    }
  };

  return (
    <div
      className={`flex flex-col rounded-xl border border-border/80 bg-card/90 backdrop-blur-md p-4 shadow-lg ${className}`}
      role="region"
      aria-label="Accessible Hostel Room Directory"
    >
      {/* Hidden Live Region for Screen Readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Room Directory (Accessible)</h3>
          <p className="text-[11px] text-muted-foreground">
            Keyboard-navigable list of all rooms. Arrow keys to browse, Enter to select.
          </p>
        </div>
        <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
          {visibleRooms.length} rooms
        </span>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Filter by room number, wing, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-8 h-8 text-xs bg-muted/30"
          aria-label="Filter room list"
        />
      </div>

      {/* Listbox */}
      <div
        ref={listRef}
        role="listbox"
        aria-label="Hostel rooms list"
        className="divide-y divide-border/60 overflow-y-auto max-h-60 rounded-lg border border-border/60"
      >
        {visibleRooms.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground">
            No rooms match the search criteria.
          </div>
        ) : (
          visibleRooms.map((room, idx) => {
            const isSelected = selectedRoom?.id === room.id;
            const statusColor = STATUS_COLORS[room.status];

            return (
              <button
                key={room.id}
                data-index={idx}
                role="option"
                aria-selected={isSelected}
                tabIndex={isSelected || idx === 0 ? 0 : -1}
                onClick={() => onSelectRoom(room)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className={`w-full flex items-center justify-between p-2.5 text-left text-xs transition-colors hover:bg-muted/40 focus:bg-muted/50 focus:outline-none focus:ring-1 focus:ring-primary ${
                  isSelected ? "bg-primary/10 text-primary font-semibold" : "text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: statusColor }}
                    aria-hidden="true"
                  />
                  <div>
                    <span className="font-mono font-bold block">Room {room.roomNumber}</span>
                    <span className="text-[10px] text-muted-foreground">
                      Floor {room.floor} • {room.wing} • {room.roomType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-right">
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {room.occupiedCount}/{room.capacity} beds
                  </span>
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

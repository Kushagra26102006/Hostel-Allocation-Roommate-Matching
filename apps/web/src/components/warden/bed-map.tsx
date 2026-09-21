"use client";

import * as React from "react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from "@dnd-kit/core";
import type { DragStartEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { Building, AlertTriangle, User, Plus, Accessibility, Clock, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { BedChip } from "./bed-chip";
import type { BedData, RoomContextData, BedAssignment } from "./bed-chip";
import { OverrideModal } from "./override-modal";
import type { OverrideTargetInfo } from "./override-modal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export interface FloorData {
  floorNumber: number;
  floorLabel: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  rooms: Array<{
    id: string;
    roomNumber: string;
    roomType: string;
    capacity: number;
    accessible: boolean;
    occupiedCount: number;
    beds: BedData[];
  }>;
}

interface BedMapProps {
  draftId: string;
  draftVersion: number;
  floors: FloorData[];
  onRefreshRequested?: () => void;
  onViewExplanation?: (assignment: BedAssignment) => void;
}

export const BedMap: React.FC<BedMapProps> = ({
  draftId,
  draftVersion,
  floors,
  onRefreshRequested,
  onViewExplanation,
}) => {
  const [selectedFloorNum, setSelectedFloorNum] = React.useState<number>(() => {
    return floors[0]?.floorNumber ?? 1;
  });

  // Active drag state
  const [activeDragAssignment, setActiveDragAssignment] = React.useState<BedAssignment | null>(
    null,
  );
  const [activeSourceBed, setActiveSourceBed] = React.useState<BedData | null>(null);

  // Live conflict validation state
  const [conflictTarget, setConflictTarget] = React.useState<{
    bedId: string;
    reason: string;
  } | null>(null);

  // Screen reader announcer for live updates
  const [srAnnouncement, setSrAnnouncement] = React.useState<string>("");

  // Override modal state
  const [overrideTarget, setOverrideTarget] = React.useState<OverrideTargetInfo | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = React.useState(false);

  // Filter state for bed map (e.g. show only free, only accessible)
  const [filterType, setFilterType] = React.useState<"all" | "free" | "accessible" | "conflicts">(
    "all",
  );

  // View mode toggle: spatial grid vs accessible semantic table
  const [viewMode, setViewMode] = React.useState<"grid" | "table">("grid");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor),
  );

  const currentFloor = floors.find((f) => f.floorNumber === selectedFloorNum) ?? floors[0];

  // Validation cache to prevent duplicate fetch calls during drag
  const validationCacheRef = React.useRef<Map<string, { valid: boolean; reason?: string }>>(
    new Map(),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as
      | {
          assignment?: BedAssignment;
          sourceBed?: BedData;
        }
      | undefined;

    if (data?.assignment) {
      setActiveDragAssignment(data.assignment);
      setActiveSourceBed(data.sourceBed ?? null);
      setSrAnnouncement(
        `Started moving student ${data.assignment.studentName}. Navigate to target bed and press Space or drop to reassign.`,
      );
    }
  };

  const handleDragOver = async (event: DragOverEvent) => {
    const over = event.over;
    if (!over || !activeDragAssignment) {
      setConflictTarget(null);
      return;
    }

    const overData = over.data.current as
      | {
          bed?: BedData;
          room?: RoomContextData;
        }
      | undefined;

    if (!overData?.bed) {
      setConflictTarget(null);
      return;
    }

    const targetBed = overData.bed;

    // If hovering over the same bed, no conflict check needed
    if (activeSourceBed && targetBed.id === activeSourceBed.id) {
      setConflictTarget(null);
      return;
    }

    const cacheKey = `${activeDragAssignment.studentId}:${targetBed.id}`;
    if (validationCacheRef.current.has(cacheKey)) {
      const cached = validationCacheRef.current.get(cacheKey)!;
      if (!cached.valid) {
        setConflictTarget({ bedId: targetBed.id, reason: cached.reason || "Constraint violation" });
      } else {
        setConflictTarget(null);
      }
      return;
    }

    try {
      const res = await fetch(`/api/v1/drafts/${draftId}/validate-target`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: activeDragAssignment.studentId,
          target_bed_id: targetBed.id,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        validationCacheRef.current.set(cacheKey, {
          valid: json.valid,
          reason: json.reasons?.[0]?.message,
        });

        if (!json.valid) {
          const reason = json.reasons?.[0]?.message || "Hard constraint violation";
          setConflictTarget({ bedId: targetBed.id, reason });
          setSrAnnouncement(`Target Bed ${targetBed.bedNo} conflict: ${reason}`);
        } else {
          setConflictTarget(null);
          setSrAnnouncement(
            `Target Bed ${targetBed.bedNo} is valid for ${activeDragAssignment.studentName}.`,
          );
        }
      }
    } catch {
      // ignore transient network check errors during drag
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over } = event;
    const dragAssignment = activeDragAssignment;
    const sourceBed = activeSourceBed;

    setActiveDragAssignment(null);
    setActiveSourceBed(null);
    setConflictTarget(null);

    if (!over || !dragAssignment) return;

    const overData = over.data.current as
      | {
          bed?: BedData;
          room?: RoomContextData;
        }
      | undefined;

    if (!overData?.bed || !overData.room) return;

    const targetBed = overData.bed;
    const targetRoom = overData.room;

    // Do nothing if dropped on exact same bed
    if (sourceBed && sourceBed.id === targetBed.id) return;

    // Open override modal with prefilled details
    setOverrideTarget({
      assignmentId: dragAssignment.id,
      studentName: dragAssignment.studentName,
      rollNumber: dragAssignment.rollNumber,
      fromBedNo: sourceBed?.bedNo ?? "N/A",
      fromRoomNumber: sourceBed ? "Current Room" : "Unallocated",
      toBedId: targetBed.id,
      toBedNo: targetBed.bedNo,
      toRoomNumber: targetRoom.roomNumber,
      toRoomAccessible: targetRoom.accessible,
      toBedAccessible: targetBed.accessible,
    });
    setIsOverrideModalOpen(true);
  };

  // Keyboard/Screen-reader "Move to..." handler invoked directly from BedChip menu
  const handleMoveRequestedFromMenu = (targetBed: BedData, targetRoom: RoomContextData) => {
    if (targetBed.assignment) {
      // Bed is occupied; prompt to reassign this occupant
      setOverrideTarget({
        assignmentId: targetBed.assignment.id,
        studentName: targetBed.assignment.studentName,
        rollNumber: targetBed.assignment.rollNumber,
        fromBedNo: targetBed.bedNo,
        fromRoomNumber: targetRoom.roomNumber,
        toBedId: targetBed.id,
        toBedNo: targetBed.bedNo,
        toRoomNumber: targetRoom.roomNumber,
        toRoomAccessible: targetRoom.accessible,
        toBedAccessible: targetBed.accessible,
      });
      setIsOverrideModalOpen(true);
    } else {
      // Empty bed target
      setOverrideTarget({
        assignmentId: "",
        studentName: "Unallocated Student",
        rollNumber: "Pending",
        fromBedNo: "None",
        fromRoomNumber: "None",
        toBedId: targetBed.id,
        toBedNo: targetBed.bedNo,
        toRoomNumber: targetRoom.roomNumber,
        toRoomAccessible: targetRoom.accessible,
        toBedAccessible: targetBed.accessible,
      });
      setIsOverrideModalOpen(true);
    }
  };

  // Filtered rooms logic
  const filteredRooms = React.useMemo(() => {
    if (!currentFloor) return [];
    if (filterType === "all") return currentFloor.rooms;

    return currentFloor.rooms
      .map((room) => {
        const matchingBeds = room.beds.filter((b) => {
          if (filterType === "free") return !b.assignment;
          if (filterType === "accessible") return b.accessible;
          if (filterType === "conflicts") return b.status === "conflict";
          return true;
        });
        return {
          ...room,
          beds: matchingBeds,
        };
      })
      .filter((room) => room.beds.length > 0);
  }, [currentFloor, filterType]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* ARIA Live Region for Screen Readers */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
          {srAnnouncement}
        </div>

        {/* Screen-reader pass notes and keyboard instructions */}
        <div
          className="sr-only"
          role="note"
          aria-label="Screen reader navigation notes for hostel bed map"
        >
          <p>
            Hostel bed map for Floor {currentFloor?.floorNumber}. This view provides spatial bed
            allocation status across rooms. Visual users can drag and drop student cards between
            beds. For keyboard and screen reader users: activate each bed chip&apos;s action
            dropdown menu using Enter or Space to move students, view match explanations, or open
            the Warden Override dialog. Alternatively, activate the &quot;Accessible Table
            View&quot; button in the toolbar for sequential tabular navigation.
          </p>
        </div>

        {/* Floor Selection & Quick Stats Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Hostel Bed Map</h2>
            <Badge variant="outline" className="ml-1 text-xs">
              Floor {currentFloor?.floorNumber || 1} of {floors.length}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Floor switcher tabs */}
            <Tabs
              value={String(selectedFloorNum)}
              onValueChange={(val) => setSelectedFloorNum(parseInt(val, 10))}
              className="w-auto"
            >
              <TabsList className="bg-muted/60">
                {floors.map((floor) => (
                  <TabsTrigger
                    key={floor.floorNumber}
                    value={String(floor.floorNumber)}
                    className="text-xs px-3 py-1.5"
                  >
                    Floor {floor.floorNumber}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {/* Quick Filter Buttons */}
            <div className="flex items-center gap-1 border-l pl-2 ml-1 text-xs">
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  filterType === "all"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground",
                )}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType("free")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  filterType === "free"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground",
                )}
              >
                Available
              </button>
              <button
                type="button"
                onClick={() => setFilterType("accessible")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors",
                  filterType === "accessible"
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground",
                )}
              >
                Accessible
              </button>
            </div>

            {/* View Mode Switcher: Grid vs Semantic Table */}
            <div className="flex items-center gap-1 border-l pl-2 ml-1 text-xs">
              <button
                type="button"
                onClick={() => setViewMode((v) => (v === "grid" ? "table" : "grid"))}
                aria-pressed={viewMode === "table"}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors border",
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 hover:bg-muted text-muted-foreground border-border",
                )}
              >
                {viewMode === "table" ? "Show Grid View" : "Accessible Table View"}
              </button>
            </div>
          </div>
        </div>

        {/* Legend Bar ensuring multi-modal cue compliance */}
        <div
          className="flex flex-wrap items-center gap-4 px-4 py-2 bg-muted/40 rounded-lg text-xs text-muted-foreground border"
          aria-label="Bed Status Legend"
        >
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" /> Legend:
          </span>
          <span className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Assigned
          </span>
          <span className="flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-slate-400" />
            <span className="w-2.5 h-2.5 rounded border border-slate-400 border-dashed" /> Free
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="w-2.5 h-2.5 rounded bg-amber-400 border border-dashed border-amber-600" />{" "}
            Waitlist Priority
          </span>
          <span className="flex items-center gap-1.5">
            <Accessibility className="w-3.5 h-3.5 text-sky-600" />
            <span className="w-2.5 h-2.5 rounded border-2 border-sky-500 ring-1 ring-sky-300" />{" "}
            Accessible
          </span>
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            <span className="w-2.5 h-2.5 rounded bg-red-500" /> Conflict
          </span>
        </div>

        {viewMode === "table" ? (
          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <caption className="p-3 text-sm font-semibold text-foreground border-b text-left bg-muted/20">
                Floor {currentFloor?.floorNumber || 1} Bed Allocations Tabular View (
                {filteredRooms.length} rooms)
              </caption>
              <thead>
                <tr className="border-b bg-muted/50 text-muted-foreground font-medium">
                  <th scope="col" className="p-3">
                    Room
                  </th>
                  <th scope="col" className="p-3">
                    Type
                  </th>
                  <th scope="col" className="p-3">
                    Bed No
                  </th>
                  <th scope="col" className="p-3">
                    Status
                  </th>
                  <th scope="col" className="p-3">
                    Occupant
                  </th>
                  <th scope="col" className="p-3">
                    Roll No
                  </th>
                  <th scope="col" className="p-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRooms.flatMap((room) =>
                  room.beds.map((bed) => (
                    <tr key={bed.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-semibold text-foreground">Room {room.roomNumber}</td>
                      <td className="p-3 uppercase text-muted-foreground">{room.roomType}</td>
                      <td className="p-3 font-mono font-medium">Bed {bed.bedNo}</td>
                      <td className="p-3">
                        <span className="capitalize">{bed.status}</span>
                      </td>
                      <td className="p-3 font-medium text-foreground">
                        {bed.assignment ? bed.assignment.studentName : "—"}
                      </td>
                      <td className="p-3 text-muted-foreground font-mono">
                        {bed.assignment ? bed.assignment.rollNumber : "—"}
                      </td>
                      <td className="p-3">
                        {bed.assignment ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => onViewExplanation?.(bed.assignment!)}
                              className="px-2.5 py-1 rounded text-xs bg-muted hover:bg-muted/80 text-foreground border min-h-[36px]"
                            >
                              Explanation
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRequestedFromMenu(bed, room)}
                              className="px-2.5 py-1 rounded text-xs bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 border border-amber-500/30 min-h-[36px]"
                            >
                              Move
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleMoveRequestedFromMenu(bed, room)}
                            className="px-2.5 py-1 rounded text-xs bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 border border-emerald-500/30 min-h-[36px]"
                          >
                            Assign Bed
                          </button>
                        )}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Spatial Room Grid */
          <div
            role="grid"
            aria-label={`Bed Map for Floor ${currentFloor?.floorNumber || 1}`}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {filteredRooms.map((room) => {
              const isFull = room.occupiedCount >= room.capacity;
              return (
                <div
                  key={room.id}
                  role="row"
                  aria-label={`Room ${room.roomNumber}, ${room.roomType}, ${room.occupiedCount} of ${room.capacity} occupied`}
                  className="bg-card rounded-xl border p-3.5 flex flex-col justify-between shadow-sm hover:border-primary/40 transition-colors"
                >
                  {/* Room Header */}
                  <div
                    role="rowheader"
                    className="flex items-center justify-between border-b pb-2 mb-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">
                        Room {room.roomNumber}
                      </span>
                      <span className="text-[11px] text-muted-foreground uppercase font-medium px-1.5 py-0.5 bg-muted rounded">
                        {room.roomType}
                      </span>
                      {room.accessible && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-sky-600 border-sky-300 py-0 gap-1"
                        >
                          <Accessibility className="w-2.5 h-2.5" /> Accessible
                        </Badge>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-mono font-semibold",
                        isFull
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-amber-600 dark:text-amber-400",
                      )}
                    >
                      {room.occupiedCount}/{room.capacity}
                    </span>
                  </div>

                  {/* Beds in Room */}
                  <div className="grid grid-cols-2 gap-2">
                    {room.beds.map((bed) => {
                      const isConflict = conflictTarget?.bedId === bed.id;
                      const conflictReason = isConflict ? conflictTarget.reason : undefined;

                      return (
                        <BedChip
                          key={bed.id}
                          bed={bed}
                          room={{
                            id: room.id,
                            roomNumber: room.roomNumber,
                            roomType: room.roomType,
                            capacity: room.capacity,
                            accessible: room.accessible,
                          }}
                          isTargetConflict={isConflict}
                          {...(conflictReason ? { conflictReason } : {})}
                          onMoveRequested={(b) =>
                            handleMoveRequestedFromMenu(b, {
                              id: room.id,
                              roomNumber: room.roomNumber,
                              roomType: room.roomType,
                              capacity: room.capacity,
                              accessible: room.accessible,
                            })
                          }
                          onViewExplanation={onViewExplanation}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredRooms.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed rounded-xl">
            <p className="text-sm text-muted-foreground">
              No rooms match the selected filter on Floor {currentFloor?.floorNumber}.
            </p>
          </div>
        )}

        {/* Drag Overlay with magnetic preview */}
        <DragOverlay>
          {activeDragAssignment && (
            <div className="bg-card border-2 border-primary shadow-2xl rounded-lg p-2.5 text-xs select-none pointer-events-none opacity-95 scale-105">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>{activeDragAssignment.studentName}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {activeDragAssignment.rollNumber} • Reassigning...
              </p>
            </div>
          )}
        </DragOverlay>

        {/* Override Modal */}
        <OverrideModal
          open={isOverrideModalOpen}
          onOpenChange={(open) => {
            setIsOverrideModalOpen(open);
            if (!open) setOverrideTarget(null);
          }}
          targetInfo={overrideTarget}
          draftId={draftId}
          draftVersion={draftVersion}
          onSuccess={() => {
            onRefreshRequested?.();
            setSrAnnouncement("Student assignment overridden successfully.");
          }}
        />
      </div>
    </DndContext>
  );
};

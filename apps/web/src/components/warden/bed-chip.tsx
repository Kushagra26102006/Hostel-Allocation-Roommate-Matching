"use client";

import * as React from "react";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
  User,
  Plus,
  Accessibility,
  AlertTriangle,
  Clock,
  MoreVertical,
  ArrowRightLeft,
  Info,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type BedStatus = "assigned" | "free" | "waitlist_candidate" | "accessible" | "conflict";

export interface BedAssignment {
  id: string;
  studentId: string;
  studentName: string;
  email: string;
  rollNumber: string;
  quota?: string;
  score?: number;
  explanation?: {
    summarySentence?: string;
    subScores?: {
      p?: number;
      c?: number;
      f?: number;
      d?: number;
      k?: number;
    };
    hardConstraintsPassed?: string[];
  };
}

export interface BedData {
  id: string;
  bedNo: string;
  accessible: boolean;
  status: BedStatus;
  assignment: BedAssignment | null;
}

export interface RoomContextData {
  id: string;
  roomNumber: string;
  roomType: string;
  capacity: number;
  accessible: boolean;
}

interface BedChipProps {
  bed: BedData;
  room: RoomContextData;
  isSelected?: boolean;
  isTargetConflict?: boolean;
  conflictReason?: string | undefined;
  onSelect?: ((bed: BedData) => void) | undefined;
  onMoveRequested?: ((targetBed: BedData) => void) | undefined;
  onViewExplanation?: ((assignment: BedAssignment) => void) | undefined;
}

export const BedChip: React.FC<BedChipProps> = ({
  bed,
  room,
  isSelected = false,
  isTargetConflict = false,
  conflictReason,
  onSelect,
  onMoveRequested,
  onViewExplanation,
}) => {
  const [ripple, setRipple] = React.useState(false);

  // Droppable configuration for drag-and-drop reassignments
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `bed-${bed.id}`,
    data: {
      bed,
      room,
    },
  });

  // Draggable configuration if bed has an occupant
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: bed.assignment ? `student-${bed.assignment.id}` : `empty-${bed.id}`,
    disabled: !bed.assignment,
    data: {
      assignment: bed.assignment,
      sourceBed: bed,
      sourceRoom: room,
    },
  });

  const effectiveStatus: BedStatus = isTargetConflict ? "conflict" : bed.status;

  const handleClick = (_e: React.MouseEvent) => {
    setRipple(true);
    setTimeout(() => setRipple(false), 400);
    onSelect?.(bed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(bed);
    }
  };

  // Status-specific visual tokens (colour + icon + pattern)
  // Ensures WCAG 1.4.1: Use of Color (colour is never the only visual cue)
  const getStatusVisuals = () => {
    switch (effectiveStatus) {
      case "conflict":
        return {
          bg: "bg-red-50 dark:bg-red-950/40",
          border: "border-2 border-red-500 shadow-red-200 dark:shadow-red-950/50",
          text: "text-red-900 dark:text-red-200",
          badgeBg: "bg-red-600 text-white",
          patternClass:
            "bg-[radial-gradient(#ef4444_1px,transparent_1px)] [background-size:6px_6px]",
          icon: (
            <AlertTriangle
              className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0"
              aria-hidden="true"
            />
          ),
          label: "Conflict",
        };
      case "assigned":
        return {
          bg: "bg-emerald-50/70 dark:bg-emerald-950/30",
          border: "border border-emerald-500/70 dark:border-emerald-600",
          text: "text-emerald-950 dark:text-emerald-100",
          badgeBg: "bg-emerald-600 text-white",
          patternClass: "",
          icon: (
            <User
              className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0"
              aria-hidden="true"
            />
          ),
          label: "Assigned",
        };
      case "accessible":
        return {
          bg: "bg-sky-50 dark:bg-sky-950/40",
          border: "border-2 border-sky-500 ring-2 ring-sky-300 dark:ring-sky-800",
          text: "text-sky-950 dark:text-sky-100",
          badgeBg: "bg-sky-600 text-white",
          patternClass:
            "bg-[linear-gradient(45deg,#0284c7_1px,transparent_1px)] [background-size:8px_8px]",
          icon: (
            <Accessibility
              className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0"
              aria-hidden="true"
            />
          ),
          label: "Accessible",
        };
      case "waitlist_candidate":
        return {
          bg: "bg-amber-50 dark:bg-amber-950/30",
          border: "border border-amber-500 border-dashed",
          text: "text-amber-950 dark:text-amber-100",
          badgeBg: "bg-amber-600 text-white",
          patternClass:
            "bg-[repeating-linear-gradient(45deg,#f59e0b,#f59e0b_2px,transparent_2px,transparent_8px)] opacity-90",
          icon: (
            <Clock
              className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0"
              aria-hidden="true"
            />
          ),
          label: "Waitlist Candidate",
        };
      case "free":
      default:
        return {
          bg: "bg-slate-50 dark:bg-slate-900/50",
          border: "border border-slate-300 dark:border-slate-700 border-dashed",
          text: "text-slate-700 dark:text-slate-300",
          badgeBg: "bg-slate-500 text-white",
          patternClass: "",
          icon: (
            <Plus
              className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0"
              aria-hidden="true"
            />
          ),
          label: "Free",
        };
    }
  };

  const visuals = getStatusVisuals();

  return (
    <div
      ref={setDropRef}
      className={cn(
        "relative rounded-lg p-2.5 transition-all text-xs select-none",
        // Base visuals
        visuals.bg,
        visuals.border,
        visuals.text,
        // Reduced motion vs standard motion styles
        // Hover lift: disabled under prefers-reduced-motion
        "hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none",
        // Pulse on conflict: disabled under prefers-reduced-motion (uses outline highlight instead)
        effectiveStatus === "conflict" &&
          "animate-pulse motion-reduce:animate-none motion-reduce:ring-4 motion-reduce:ring-destructive",
        // Selected highlight
        isSelected && "ring-2 ring-primary ring-offset-2",
        // Dropping hover state (magnetic snap feeling)
        isOver &&
          !isTargetConflict &&
          "ring-2 ring-primary ring-offset-2 scale-[1.03] transition-transform",
        isDragging && "opacity-40",
      )}
      role="gridcell"
      aria-label={`Room ${room.roomNumber}, Bed ${bed.bedNo}: ${visuals.label}${
        bed.assignment ? `, Occupant: ${bed.assignment.studentName}` : ""
      }${isTargetConflict ? `. Conflict: ${conflictReason || "Hard constraint violation"}` : ""}`}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      data-bed-id={bed.id}
      data-bed-no={bed.bedNo}
      data-room-no={room.roomNumber}
    >
      {/* Background Pattern Layer for Accessible Texture */}
      {visuals.patternClass && (
        <div
          className={cn(
            "absolute inset-0 pointer-events-none rounded-lg opacity-15",
            visuals.patternClass,
          )}
          aria-hidden="true"
        />
      )}

      {/* Click Ripple Indicator (disabled on reduced motion) */}
      {ripple && (
        <span
          className="absolute inset-0 rounded-lg bg-primary/20 animate-ping pointer-events-none motion-reduce:hidden"
          aria-hidden="true"
        />
      )}

      {/* Bed Header: Letter, Status Icon, and Actions Menu */}
      <div className="flex items-center justify-between gap-1 mb-1 relative z-10">
        <div className="flex items-center gap-1.5">
          {/* Bed Letter Badge */}
          <span
            className={cn(
              "flex items-center justify-center font-bold px-1.5 py-0.5 rounded text-[11px] uppercase tracking-wider",
              visuals.badgeBg,
            )}
          >
            {bed.bedNo}
          </span>
          {/* Status Icon */}
          <span title={visuals.label} className="flex items-center">
            {visuals.icon}
          </span>
          {bed.accessible && effectiveStatus !== "accessible" && (
            <span title="Wheelchair Accessible Bed">
              <Accessibility className="w-3 h-3 text-sky-600 dark:text-sky-400" />
            </span>
          )}
        </div>

        {/* Dropdown Menu: Screen Reader & Keyboard Accessible Action Fallback */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label={`Bed ${bed.bedNo} options`}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              Bed {bed.bedNo} • Room {room.roomNumber}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {bed.assignment && (
              <>
                <DropdownMenuItem
                  onClick={() => onViewExplanation?.(bed.assignment!)}
                  className="gap-2"
                >
                  <Info className="w-4 h-4 text-blue-500" />
                  View match explanation
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onMoveRequested?.(bed)} className="gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-amber-500" />
                  Move {bed.assignment.studentName}
                </DropdownMenuItem>
              </>
            )}
            {!bed.assignment && (
              <DropdownMenuItem onClick={() => onMoveRequested?.(bed)} className="gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Assign student to this bed
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Bed Content / Occupant info */}
      <div
        ref={setDragRef}
        {...dragAttributes}
        {...dragListeners}
        className={cn("relative z-10", bed.assignment ? "cursor-grab active:cursor-grabbing" : "")}
      >
        {bed.assignment ? (
          <div className="space-y-0.5">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="font-semibold truncate text-[11px] leading-tight">
                    {bed.assignment.studentName}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-xs space-y-0.5">
                    <p className="font-medium">{bed.assignment.studentName}</p>
                    <p className="text-muted-foreground">{bed.assignment.rollNumber}</p>
                    <p className="text-muted-foreground">{bed.assignment.email}</p>
                    {bed.assignment.score !== undefined && (
                      <p className="text-emerald-500 font-mono">
                        Score: {bed.assignment.score}/100
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="truncate">{bed.assignment.rollNumber}</span>
              {bed.assignment.score !== undefined && (
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  {bed.assignment.score}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="py-1 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-medium text-muted-foreground">
              {effectiveStatus === "accessible"
                ? "Accessible Free"
                : effectiveStatus === "waitlist_candidate"
                  ? "Waitlist Priority"
                  : "Available"}
            </span>
          </div>
        )}
      </div>

      {/* Conflict Reason Tooltip / Notice banner when active conflict */}
      {isTargetConflict && conflictReason && (
        <div className="mt-1 p-1 rounded bg-red-100 dark:bg-red-900/60 border border-red-300 dark:border-red-800 text-[10px] text-red-800 dark:text-red-200 font-medium">
          {conflictReason}
        </div>
      )}
    </div>
  );
};

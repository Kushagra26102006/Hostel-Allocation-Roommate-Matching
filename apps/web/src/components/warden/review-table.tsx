"use client";

import * as React from "react";
import {
  useReactTable,
  getCoreRowModel,
  getExpandedRowModel,
  flexRender,
} from "@tanstack/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Search,
  ChevronDown,
  ChevronRight,
  Accessibility,
  AlertTriangle,
  ArrowRightLeft,
  Info,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { EnrichedAssignment } from "./explanation-drawer";

export type AssignmentRowData = EnrichedAssignment;

export type FilterCategory =
  "all" | "unallocated" | "low_compatibility" | "accessibility" | "overridden" | "waitlisted";

interface ReviewTableProps {
  draftId: string;
  items: AssignmentRowData[];
  totalCount: number;
  isLoading?: boolean;
  activeFilter: FilterCategory;
  onFilterChange: (filter: FilterCategory) => void;
  searchQuery: string;
  onSearchChange: (search: string) => void;
  onOpenExplanation: (assignment: EnrichedAssignment) => void;
  onReassign?: (assignment: AssignmentRowData) => void;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
}

export const ReviewTable: React.FC<ReviewTableProps> = ({
  items,
  totalCount,
  isLoading = false,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onOpenExplanation,
  onReassign,
  onLoadMore,
  hasNextPage = false,
}) => {
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(0);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const filterOptions: Array<{ id: FilterCategory; label: string; countSuffix?: string }> = [
    { id: "all", label: "All Students" },
    { id: "unallocated", label: "Unallocated" },
    { id: "low_compatibility", label: "Low Compatibility (<65)" },
    { id: "accessibility", label: "Accessibility Needs" },
    { id: "overridden", label: "Overridden" },
    { id: "waitlisted", label: "Waitlisted" },
  ];

  const columns = React.useMemo<ColumnDef<AssignmentRowData>[]>(
    () => [
      {
        id: "expander",
        header: () => <span className="sr-only">Expand</span>,
        cell: ({ row }) => (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              row.toggleExpanded();
            }}
            className="p-1 hover:bg-muted rounded text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label={row.getIsExpanded() ? "Collapse row details" : "Expand row details"}
          >
            {row.getIsExpanded() ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ),
        size: 36,
      },
      {
        accessorKey: "student",
        header: "Student",
        cell: ({ row }) => {
          const s = row.original.student;
          return (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 font-medium text-foreground truncate">
                <span className="truncate">{s.name}</span>
                {s.accessibilityNeed && (
                  <span title="Accessibility accommodation required">
                    <Accessibility className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono">{s.rollNumber}</span>
                <span>•</span>
                <span>{s.programme}</span>
                <span>•</span>
                <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                  {s.quota}
                </Badge>
              </div>
            </div>
          );
        },
        size: 240,
      },
      {
        id: "placement",
        header: "Assigned Room / Bed",
        cell: ({ row }) => {
          const { bed, room, hostel } = row.original;
          return (
            <div className="flex flex-col text-xs">
              <div className="flex items-center gap-1 font-medium">
                <span>Room {room.roomNumber}</span>
                <span className="bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded text-[10px]">
                  Bed {bed.bedNo}
                </span>
                {bed.accessible && (
                  <Badge variant="outline" className="text-[10px] text-sky-600 border-sky-300 py-0">
                    Accessible
                  </Badge>
                )}
              </div>
              <span className="text-muted-foreground truncate">{hostel.name}</span>
            </div>
          );
        },
        size: 180,
      },
      {
        accessorKey: "score",
        header: "Match Score",
        cell: ({ row }) => {
          const score = row.original.score;
          const { P, C, F, D, K } = row.original.breakdown;
          const isLow = score < 60 || C < 60;
          return (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Badge
                  variant={isLow ? "destructive" : "default"}
                  className={cn(
                    "font-mono font-bold text-xs",
                    !isLow && "bg-emerald-600 hover:bg-emerald-700",
                  )}
                >
                  {score.toFixed(1)} / 100
                </Badge>
                {isLow && (
                  <span title="Low compatibility match" className="text-amber-500">
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
              <div
                className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono"
                title={`P: ${P}, C: ${C}, F: ${F}, D: ${D}, K: ${K}`}
              >
                <span>P:{P}</span>
                <span>C:{C}</span>
                <span>F:{F}</span>
              </div>
            </div>
          );
        },
        size: 140,
      },
      {
        id: "status",
        header: "Status / Audit",
        cell: ({ row }) => {
          const { isOverridden, override } = row.original;
          if (isOverridden) {
            return (
              <div className="flex flex-col gap-1">
                <Badge
                  variant="outline"
                  className="w-fit text-amber-600 border-amber-400 gap-1 text-[11px]"
                >
                  <ArrowRightLeft className="w-3 h-3" /> Overridden
                </Badge>
                {override?.escalated && (
                  <Badge variant="destructive" className="w-fit text-[10px] gap-1 py-0">
                    <ShieldAlert className="w-3 h-3" /> Escalated
                  </Badge>
                )}
              </div>
            );
          }
          return (
            <Badge
              variant="secondary"
              className="w-fit text-emerald-700 dark:text-emerald-300 gap-1 text-[11px]"
            >
              <CheckCircle2 className="w-3 h-3" /> Engine Placed
            </Badge>
          );
        },
        size: 140,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs gap-1 px-2"
                onClick={() => onOpenExplanation(item)}
                title="View Explanation Sheet"
              >
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Explain</span>
              </Button>
              {onReassign && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1 px-2 text-amber-600 border-amber-300 hover:bg-amber-50"
                  onClick={() => onReassign(item)}
                  title="Override assignment"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Override</span>
                </Button>
              )}
            </div>
          );
        },
        size: 150,
      },
    ],
    [onOpenExplanation, onReassign],
  );

  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  const { rows } = table.getRowModel();

  // Virtualizer setup for 8,000+ items smooth scrolling
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  // Keyboard navigation through rows
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedRowIndex((prev) => Math.min(prev + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedRowIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const row = rows[focusedRowIndex];
      if (row) {
        row.toggleExpanded();
      }
    }
  };

  return (
    <div className="space-y-3" onKeyDown={handleKeyDown} tabIndex={0}>
      {/* Search & Saved Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student, roll number, room..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {filterOptions.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange(opt.id)}
              className={cn(
                "px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap",
                activeFilter === opt.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row counter info */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          Showing {items.length} of {totalCount} assignments
        </span>
        {isLoading && (
          <span className="flex items-center gap-1.5 text-primary">
            <Loader2 className="w-3 h-3 animate-spin" /> Fetching latest records...
          </span>
        )}
      </div>

      {/* Virtualized Table Container */}
      <div
        ref={parentRef}
        className="h-[600px] overflow-auto border rounded-xl bg-card shadow-sm relative focus:outline-none focus:ring-1 focus:ring-primary"
        role="table"
        aria-label="Student Room Allocations"
      >
        <div className="sticky top-0 z-20 bg-muted/80 backdrop-blur border-b flex items-center text-xs font-semibold text-muted-foreground px-3 py-2.5">
          <div style={{ width: 36 }} />
          <div style={{ width: 240 }}>Student</div>
          <div style={{ width: 180 }}>Assigned Room / Bed</div>
          <div style={{ width: 140 }}>Match Score</div>
          <div style={{ width: 140 }}>Status / Audit</div>
          <div style={{ width: 150 }}>Actions</div>
        </div>

        {rows.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <p className="font-semibold text-foreground">No assignments match your criteria</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting the saved filters or search query.
            </p>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              if (!row) return null;
              const isFocused = virtualRow.index === focusedRowIndex;
              const isExpanded = row.getIsExpanded();
              const item = row.original;

              return (
                <div
                  key={row.id}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className={cn(
                    "absolute top-0 left-0 w-full border-b transition-colors",
                    isFocused && "bg-muted/50",
                    isExpanded && "bg-muted/30",
                  )}
                  style={{
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  role="row"
                  aria-selected={isFocused}
                  onClick={() => setFocusedRowIndex(virtualRow.index)}
                >
                  {/* Main Row Content */}
                  <div className="flex items-center px-3 py-2.5 text-xs">
                    {row.getVisibleCells().map((cell) => {
                      const colSize = cell.column.columnDef.size || 150;
                      return (
                        <div
                          key={cell.id}
                          style={{ width: colSize, flexShrink: 0 }}
                          className="px-1"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    })}
                  </div>

                  {/* Expandable Explanation Row */}
                  {isExpanded && (
                    <div className="px-12 py-3 bg-muted/40 border-t text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-foreground">{item.friendlySentence}</p>
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            {item.tiebreakInfo}
                          </p>
                        </div>
                      </div>

                      {item.isOverridden && item.override && (
                        <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px]">
                          <span className="font-semibold text-amber-900 dark:text-amber-200">
                            Warden Override by {item.override.actor.email}:
                          </span>{" "}
                          <span className="text-amber-800 dark:text-amber-300">
                            &quot;{item.override.reason}&quot;
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs gap-1"
                          onClick={() => onOpenExplanation(item)}
                        >
                          <Info className="w-3.5 h-3.5 text-blue-500" />
                          View Complete Score Breakdown &amp; Invariants
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Infinite Scroll / Cursor Load More Trigger */}
      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onLoadMore}
            disabled={isLoading}
            className="text-xs gap-2"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Load More Assignments
          </Button>
        </div>
      )}
    </div>
  );
};

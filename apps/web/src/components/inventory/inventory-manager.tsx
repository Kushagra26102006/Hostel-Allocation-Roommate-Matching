"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Building2,
  Layers,
  DoorClosed,
  BedDouble,
  ChevronRight,
  ChevronDown,
  Upload,
  Download,
  Search,
  Filter,
  CheckSquare,
  Square,
  Edit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusChip, type InventoryStatus } from "./status-chip";
import { toast } from "sonner";

export interface TreeBedItem {
  id: string;
  bed_no: string;
  status: InventoryStatus;
  attributes?: Record<string, unknown>;
  version: number;
}

export interface TreeRoomItem {
  id: string;
  room_number: string;
  room_type: string;
  capacity: number;
  accessible: boolean;
  ac: boolean;
  status: InventoryStatus;
  beds: TreeBedItem[];
}

export interface TreeFloorItem {
  floor_no: number;
  wing: string;
  lift_access: boolean;
  rooms: TreeRoomItem[];
}

export interface TreeBlockItem {
  id: string;
  name: string;
  floors: TreeFloorItem[];
}

export interface TreeHostelItem {
  id: string;
  name: string;
  gender_policy: string;
  status: string;
  blocks: TreeBlockItem[];
}

export interface FlatTreeNode {
  id: string;
  type: "hostel" | "block" | "floor" | "room" | "bed";
  label: string;
  subLabel?: string;
  level: number;
  isExpanded?: boolean;
  hasChildren: boolean;
  status?: InventoryStatus;
  rawItem?: unknown;
  bedId?: string;
  version?: number;
}

interface InventoryManagerProps {
  initialData?: TreeHostelItem[];
  onOpenImportWizard: () => void;
}

export function InventoryManager({ initialData, onOpenImportWizard }: InventoryManagerProps) {
  const [data, setData] = React.useState<TreeHostelItem[]>(
    () => initialData ?? getSampleInventoryData(),
  );
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(
    () => new Set(["hostel-1", "block-1", "floor-1"]),
  );
  const [selectedBedIds, setSelectedBedIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [isBulkEditOpen, setIsBulkEditOpen] = React.useState(false);
  const [bulkStatus, setBulkStatus] = React.useState<InventoryStatus>("available");
  const [isExporting, setIsExporting] = React.useState(false);

  // Toggle node expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Toggle bed checkbox
  const toggleSelectBed = (bedId: string) => {
    setSelectedBedIds((prev) => {
      const next = new Set(prev);
      if (next.has(bedId)) next.delete(bedId);
      else next.add(bedId);
      return next;
    });
  };

  // Flatten tree according to expanded state and filters
  const flatNodes = React.useMemo(() => {
    const nodes: FlatTreeNode[] = [];
    const query = searchQuery.toLowerCase().trim();

    for (const hostel of data) {
      const hostelId = `hostel-${hostel.id}`;
      const isHostelExpanded = expandedIds.has(hostelId);

      nodes.push({
        id: hostelId,
        type: "hostel",
        label: hostel.name,
        subLabel: `${hostel.gender_policy} · ${hostel.blocks.length} Blocks`,
        level: 0,
        isExpanded: isHostelExpanded,
        hasChildren: hostel.blocks.length > 0,
        status: hostel.status as InventoryStatus,
      });

      if (!isHostelExpanded) continue;

      for (const block of hostel.blocks) {
        const blockId = `block-${block.id}`;
        const isBlockExpanded = expandedIds.has(blockId);

        nodes.push({
          id: blockId,
          type: "block",
          label: block.name,
          subLabel: `${block.floors.length} Floors`,
          level: 1,
          isExpanded: isBlockExpanded,
          hasChildren: block.floors.length > 0,
        });

        if (!isBlockExpanded) continue;

        for (const floor of block.floors) {
          const floorId = `floor-${block.id}-${floor.floor_no}`;
          const isFloorExpanded = expandedIds.has(floorId);

          nodes.push({
            id: floorId,
            type: "floor",
            label: `Floor ${floor.floor_no}`,
            subLabel: `Wing ${floor.wing}${floor.lift_access ? " · Lift Access" : ""} · ${floor.rooms.length} Rooms`,
            level: 2,
            isExpanded: isFloorExpanded,
            hasChildren: floor.rooms.length > 0,
          });

          if (!isFloorExpanded) continue;

          for (const room of floor.rooms) {
            const roomId = `room-${room.id}`;
            const isRoomExpanded = expandedIds.has(roomId);

            if (query && !room.room_number.toLowerCase().includes(query)) {
              // check if any bed matches
              const hasMatchingBed = room.beds.some((b) => b.bed_no.toLowerCase().includes(query));
              if (!hasMatchingBed) continue;
            }

            nodes.push({
              id: roomId,
              type: "room",
              label: `Room ${room.room_number}`,
              subLabel: `${room.room_type} · Cap: ${room.capacity} · ${room.ac ? "AC" : "Non-AC"}`,
              level: 3,
              isExpanded: isRoomExpanded,
              hasChildren: room.beds.length > 0,
              status: room.status,
            });

            if (!isRoomExpanded) continue;

            for (const bed of room.beds) {
              const bedNodeId = `bed-${bed.id}`;

              if (statusFilter !== "all" && bed.status !== statusFilter) {
                continue;
              }

              if (query && !bed.bed_no.toLowerCase().includes(query)) {
                continue;
              }

              nodes.push({
                id: bedNodeId,
                type: "bed",
                label: `Bed ${bed.bed_no}`,
                ...(bed.attributes?.window ? { subLabel: "Window seat" } : {}),
                level: 4,
                hasChildren: false,
                status: bed.status,
                bedId: bed.id,
                version: bed.version,
                rawItem: bed,
              });
            }
          }
        }
      }
    }

    return nodes;
  }, [data, expandedIds, searchQuery, statusFilter]);

  // Virtualizer setup
  const parentRef = React.useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  // Handle bulk status update
  const handleApplyBulkStatus = () => {
    if (selectedBedIds.size === 0) {
      toast.error("No beds selected");
      return;
    }

    setData((prev) =>
      prev.map((h) => ({
        ...h,
        blocks: h.blocks.map((b) => ({
          ...b,
          floors: b.floors.map((f) => ({
            ...f,
            rooms: f.rooms.map((r) => ({
              ...r,
              beds: r.beds.map((bed) =>
                selectedBedIds.has(bed.id)
                  ? { ...bed, status: bulkStatus, version: bed.version + 1 }
                  : bed,
              ),
            })),
          })),
        })),
      })),
    );

    toast.success(`Updated status of ${selectedBedIds.size} beds to "${bulkStatus}".`);
    setSelectedBedIds(new Set());
    setIsBulkEditOpen(false);
  };

  // Handle export download
  const handleExport = async (format: "csv" | "xlsx") => {
    try {
      setIsExporting(true);
      const res = await fetch(`/api/v1/inventory/export?format=${format}`);
      if (!res.ok) throw new Error("Failed to generate export file.");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-export.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Inventory exported successfully as ${format.toUpperCase()}.`);
    } catch {
      toast.error(`Export failed. Please check network connection.`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Control / Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3.5 shadow-sm backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search room or bed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-52 rounded-lg border border-input bg-background/80 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-input bg-background/80 px-2.5 py-1 text-xs">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-xs font-medium focus:outline-none"
            >
              <option value="all">All Bed Statuses</option>
              <option value="available">Available</option>
              <option value="held">Held</option>
              <option value="occupied">Occupied</option>
              <option value="out_of_service">Out of Service</option>
            </select>
          </div>

          {/* Selection indicator & Bulk Edit Trigger */}
          {selectedBedIds.size > 0 && (
            <button
              onClick={() => setIsBulkEditOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
            >
              <Edit className="h-3.5 w-3.5" />
              Edit {selectedBedIds.size} Selected Beds
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Export CSV
          </button>
          <button
            onClick={() => handleExport("xlsx")}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/80 px-3 py-1.5 text-xs font-medium hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            Export XLSX
          </button>
          <button
            onClick={onOpenImportWizard}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Upload className="h-3.5 w-3.5" />
            Import CSV / Excel
          </button>
        </div>
      </div>

      {/* Virtualized Tree Container */}
      <div className="rounded-xl border border-border/80 bg-card/80 shadow-sm backdrop-blur-sm">
        <div className="border-b border-border/60 bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Hierarchy: Hostel → Block → Floor → Room → Bed ({flatNodes.length} Visible Nodes)
        </div>

        <div ref={parentRef} className="h-[560px] overflow-auto divide-y divide-border/30 p-1">
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const node = flatNodes[virtualRow.index];
              if (!node) return null;

              const isBed = node.type === "bed";
              const isSelected = isBed && node.bedId ? selectedBedIds.has(node.bedId) : false;

              return (
                <div
                  key={node.id}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={cn(
                    "flex items-center justify-between px-3 py-1.5 hover:bg-accent/40 transition-colors text-sm",
                    isSelected && "bg-primary/5 font-medium",
                  )}
                >
                  <div
                    className="flex items-center gap-2"
                    style={{ paddingLeft: `${node.level * 22}px` }}
                  >
                    {/* Expand/Collapse Chevron */}
                    {node.hasChildren ? (
                      <button
                        onClick={() => toggleExpand(node.id)}
                        className="rounded p-0.5 text-muted-foreground hover:bg-muted"
                      >
                        {node.isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    ) : (
                      <span className="w-4" />
                    )}

                    {/* Node Type Icon */}
                    {node.type === "hostel" && <Building2 className="h-4 w-4 text-primary" />}
                    {node.type === "block" && <Layers className="h-4 w-4 text-indigo-500" />}
                    {node.type === "floor" && (
                      <div className="flex h-4 w-4 items-center justify-center rounded bg-secondary text-[10px] font-bold">
                        F
                      </div>
                    )}
                    {node.type === "room" && <DoorClosed className="h-4 w-4 text-emerald-500" />}
                    {node.type === "bed" && <BedDouble className="h-4 w-4 text-sky-500" />}

                    {/* Checkbox for beds */}
                    {isBed && node.bedId && (
                      <button
                        onClick={() => toggleSelectBed(node.bedId!)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4 text-primary" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    )}

                    {/* Label & SubLabel */}
                    <span className="font-medium text-foreground">{node.label}</span>
                    {node.subLabel && (
                      <span className="text-xs text-muted-foreground">({node.subLabel})</span>
                    )}
                  </div>

                  {/* Status Chip */}
                  {node.status && (
                    <div>
                      <StatusChip status={node.status} size="sm" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bulk Edit Modal */}
      {isBulkEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-foreground">
              Bulk Edit Beds ({selectedBedIds.size} selected)
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Batch modify the status of all currently selected beds.
            </p>

            <div className="mt-4 flex flex-col gap-2">
              <label className="text-xs font-medium text-muted-foreground">Set Bed Status</label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as InventoryStatus)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
              >
                <option value="available">Available (Vacant)</option>
                <option value="held">Held (Temporary reserve)</option>
                <option value="occupied">Occupied</option>
                <option value="out_of_service">Out of Service (Maintenance)</option>
              </select>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setIsBulkEditOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-xs font-medium hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkStatus}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Apply Updates
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fallback demo hierarchy
function getSampleInventoryData(): TreeHostelItem[] {
  return [
    {
      id: "1",
      name: "Aryabhata Hall",
      gender_policy: "male",
      status: "active",
      blocks: [
        {
          id: "1",
          name: "Block A",
          floors: [
            {
              floor_no: 1,
              wing: "North",
              lift_access: true,
              rooms: [
                {
                  id: "101",
                  room_number: "101",
                  room_type: "double",
                  capacity: 2,
                  accessible: true,
                  ac: true,
                  status: "available",
                  beds: [
                    {
                      id: "b1",
                      bed_no: "A",
                      status: "available",
                      version: 1,
                      attributes: { window: true },
                    },
                    { id: "b2", bed_no: "B", status: "occupied", version: 1 },
                  ],
                },
                {
                  id: "102",
                  room_number: "102",
                  room_type: "single",
                  capacity: 1,
                  accessible: false,
                  ac: false,
                  status: "full",
                  beds: [{ id: "b3", bed_no: "1", status: "occupied", version: 1 }],
                },
              ],
            },
            {
              floor_no: 2,
              wing: "North",
              lift_access: true,
              rooms: [
                {
                  id: "201",
                  room_number: "201",
                  room_type: "double",
                  capacity: 2,
                  accessible: false,
                  ac: true,
                  status: "available",
                  beds: [
                    { id: "b4", bed_no: "A", status: "held", version: 1 },
                    { id: "b5", bed_no: "B", status: "available", version: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "2",
      name: "Gargi Residence",
      gender_policy: "female",
      status: "active",
      blocks: [
        {
          id: "2",
          name: "Block B",
          floors: [
            {
              floor_no: 1,
              wing: "East",
              lift_access: true,
              rooms: [
                {
                  id: "101-b",
                  room_number: "G-101",
                  room_type: "triple",
                  capacity: 3,
                  accessible: true,
                  ac: false,
                  status: "available",
                  beds: [
                    { id: "b6", bed_no: "1", status: "available", version: 1 },
                    { id: "b7", bed_no: "2", status: "available", version: 1 },
                    { id: "b8", bed_no: "3", status: "out_of_service", version: 1 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

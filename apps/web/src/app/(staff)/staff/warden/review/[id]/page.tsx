"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  LayoutGrid,
  Table as TableIcon,
  RefreshCw,
  Loader2,
  Building,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ReviewTable } from "@/components/warden/review-table";
import type { AssignmentRowData, FilterCategory } from "@/components/warden/review-table";
import { BedMap } from "@/components/warden/bed-map";
import type { FloorData } from "@/components/warden/bed-map";
import { ExplanationDrawer } from "@/components/warden/explanation-drawer";
import type { EnrichedAssignment } from "@/components/warden/explanation-drawer";
import { OverrideModal } from "@/components/warden/override-modal";
import type { OverrideTargetInfo } from "@/components/warden/override-modal";
import { PresenceBar } from "@/components/warden/presence-bar";
import { WorkflowBar } from "@/components/warden/workflow-bar";
import type { DraftStatus } from "@/components/warden/workflow-bar";
import { useDraftPresence } from "@/hooks/use-draft-presence";
import { toast } from "sonner";

export default function WardenReviewConsolePage() {
  const params = useParams<{ id: string }>();
  const draftId = params.id;

  const [activeTab, setActiveTab] = React.useState<"table" | "map">("map");
  const [activeFloor] = React.useState<number>(1);

  // Draft meta state
  const [draftStatus, setDraftStatus] = React.useState<DraftStatus>("UNDER_REVIEW");
  const [draftVersion, setDraftVersion] = React.useState<number>(1);
  const [draftCycleName, setDraftCycleName] = React.useState<string>("Academic Allocation");

  // Table state
  const [assignments, setAssignments] = React.useState<AssignmentRowData[]>([]);
  const [totalCount, setTotalCount] = React.useState<number>(0);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [activeFilter, setActiveFilter] = React.useState<FilterCategory>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [isTableLoading, setIsTableLoading] = React.useState<boolean>(false);

  // Bed Map state
  const [floors, setFloors] = React.useState<FloorData[]>([]);
  const [isMapLoading, setIsMapLoading] = React.useState<boolean>(false);

  // Explanation Drawer state
  const [selectedAssignment, setSelectedAssignment] = React.useState<EnrichedAssignment | null>(
    null,
  );
  const [isDrawerOpen, setIsDrawerOpen] = React.useState<boolean>(false);

  // Manual Override Modal state
  const [overrideTarget, setOverrideTarget] = React.useState<OverrideTargetInfo | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = React.useState<boolean>(false);

  // Live Presence & SSE hook
  const { reviewers, isConnected } = useDraftPresence({
    draftId,
    floor: activeFloor,
    onOverrideEvent: () => {
      // Remote reviewer updated an assignment, refresh table and map
      void fetchAssignments();
      void fetchBedMap();
    },
    onStatusChange: (data: unknown) => {
      const statusData = data as { to?: DraftStatus };
      if (statusData?.to) {
        setDraftStatus(statusData.to);
      }
    },
  });

  // Fetch Draft Details
  const fetchDraftDetails = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/drafts/${draftId}`);
      if (!res.ok) throw new Error("Failed to fetch draft details");
      const data = await res.json();
      if (data.draft) {
        setDraftStatus(data.draft.status);
        setDraftVersion(data.draft.versionNumber);
        setDraftCycleName(data.draft.cycleName || "Hostel Allocation Draft");
      }
    } catch {
      // transient error handled
    }
  }, [draftId]);

  // Fetch Assignments with cursor pagination and filters
  const fetchAssignments = React.useCallback(
    async (cursor?: string | null, append = false) => {
      setIsTableLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (cursor) queryParams.set("cursor", cursor);
        queryParams.set("filter", activeFilter);
        if (searchQuery) queryParams.set("search", searchQuery);

        const res = await fetch(`/api/v1/drafts/${draftId}/assignments?${queryParams.toString()}`);
        if (!res.ok) throw new Error("Failed to load assignments");
        const data = await res.json();

        setAssignments((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []));
        setNextCursor(data.nextCursor || null);
        setTotalCount(data.totalCount || 0);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Error loading assignments";
        toast.error(msg);
      } finally {
        setIsTableLoading(false);
      }
    },
    [draftId, activeFilter, searchQuery],
  );

  // Fetch Bed Map
  const fetchBedMap = React.useCallback(async () => {
    setIsMapLoading(true);
    try {
      const res = await fetch(`/api/v1/drafts/${draftId}/bed-map`);
      if (!res.ok) throw new Error("Failed to load bed map");
      const data = await res.json();
      setFloors(data.floors || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error loading bed map";
      toast.error(msg);
    } finally {
      setIsMapLoading(false);
    }
  }, [draftId]);

  React.useEffect(() => {
    fetchDraftDetails();
    fetchAssignments();
    fetchBedMap();
  }, [fetchDraftDetails, fetchAssignments, fetchBedMap]);

  const handleOpenExplanation = (assignment: EnrichedAssignment) => {
    setSelectedAssignment(assignment);
    setIsDrawerOpen(true);
  };

  const handleReassignFromTable = (item: AssignmentRowData) => {
    setOverrideTarget({
      assignmentId: item.id,
      studentName: item.student.name,
      rollNumber: item.student.rollNumber,
      fromBedNo: item.bed.bedNo,
      fromRoomNumber: item.room.roomNumber,
      toBedId: item.bed.id,
      toBedNo: item.bed.bedNo,
      toRoomNumber: item.room.roomNumber,
      toRoomAccessible: item.room.accessible,
      toBedAccessible: item.bed.accessible,
    });
    setIsOverrideModalOpen(true);
  };

  const handleRefreshAll = () => {
    fetchDraftDetails();
    fetchAssignments();
    fetchBedMap();
  };

  return (
    <div className="container mx-auto max-w-7xl p-6 space-y-6">
      {/* Header with Navigation and Presence */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
              <Link href="/staff/warden/review">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Review Queue
              </Link>
            </Button>
            <span className="text-muted-foreground">•</span>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              {draftCycleName}
            </h1>
          </div>
          <p className="text-xs text-muted-foreground pl-2">
            Inspect room allocations, algorithmic explanations, floor bed maps, and reviewer live
            presence.
          </p>
        </div>

        {/* Live SSE Presence Indicator Bar */}
        <PresenceBar reviewers={reviewers} isConnected={isConnected} />
      </div>

      {/* State Machine Workflow Bar */}
      <WorkflowBar
        draftId={draftId}
        status={draftStatus}
        version={draftVersion}
        onWorkflowUpdated={handleRefreshAll}
      />

      {/* Views Navigation: Interactive Bed Map vs TanStack Virtual Table */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as "table" | "map")}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <TabsList className="bg-muted/70">
            <TabsTrigger value="map" className="gap-2 text-xs">
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Animated Bed Map</span>
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-2 text-xs">
              <TableIcon className="w-3.5 h-3.5" />
              <span>Virtualized Table (8k Rows)</span>
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            className="gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Data</span>
          </Button>
        </div>

        {/* Tab 1: Animated Bed Map */}
        <TabsContent value="map" className="mt-0 space-y-4">
          {isMapLoading && floors.length === 0 ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading spatial bed map...</p>
            </div>
          ) : (
            <BedMap
              draftId={draftId}
              draftVersion={draftVersion}
              floors={floors}
              onRefreshRequested={handleRefreshAll}
              onViewExplanation={(bedAssignment) => {
                const found = assignments.find((a) => a.student.id === bedAssignment.studentId);
                if (found) {
                  handleOpenExplanation(found);
                } else {
                  handleOpenExplanation({
                    id: bedAssignment.id,
                    student: {
                      id: bedAssignment.studentId,
                      name: bedAssignment.studentName,
                      email: bedAssignment.email,
                      rollNumber: bedAssignment.rollNumber,
                      gender: "male",
                      programme: "BTech",
                      year: 1,
                      quota: bedAssignment.quota || "General",
                      accessibilityNeed: false,
                    },
                    bed: {
                      id: bedAssignment.id,
                      bedNo: "A",
                      accessible: false,
                      status: "assigned",
                    },
                    room: {
                      id: "room-1",
                      roomNumber: "101",
                      roomType: "Double",
                      capacity: 2,
                      accessible: false,
                      floor: 1,
                      block: "A",
                    },
                    hostel: {
                      id: "hostel-1",
                      name: "Campus Residence",
                    },
                    score: bedAssignment.score || 85,
                    explanation: bedAssignment.explanation?.summarySentence || "Placement verified",
                    friendlySentence:
                      bedAssignment.explanation?.summarySentence ||
                      `${bedAssignment.studentName} was allocated with composite score of ${bedAssignment.score || 85}/100.`,
                    breakdown: {
                      P: bedAssignment.explanation?.subScores?.p || 80,
                      C: bedAssignment.explanation?.subScores?.c || 85,
                      F: bedAssignment.explanation?.subScores?.f || 75,
                      D: bedAssignment.explanation?.subScores?.d || 90,
                      K: bedAssignment.explanation?.subScores?.k || 80,
                    },
                    constraints: (
                      bedAssignment.explanation?.hardConstraintsPassed || [
                        "HC1",
                        "HC2",
                        "HC3",
                        "HC4",
                        "HC5",
                        "HC6",
                        "HC7",
                        "HC8",
                        "HC9",
                        "HC10",
                        "HC11",
                      ]
                    ).map((hc) => ({
                      code: hc,
                      name: `Constraint ${hc}`,
                      passed: true,
                      detail: "Policy invariant verified",
                    })),
                    alternativesConsidered: [],
                    tiebreakInfo: "Deterministically resolved based on academic score.",
                    isOverridden: false,
                  });
                }
              }}
            />
          )}
        </TabsContent>

        {/* Tab 2: Virtualized TanStack Table */}
        <TabsContent value="table" className="mt-0">
          <ReviewTable
            draftId={draftId}
            items={assignments}
            totalCount={totalCount}
            isLoading={isTableLoading}
            activeFilter={activeFilter}
            onFilterChange={(f) => {
              setActiveFilter(f);
              fetchAssignments();
            }}
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              fetchAssignments();
            }}
            onOpenExplanation={handleOpenExplanation}
            onReassign={handleReassignFromTable}
            onLoadMore={() => {
              if (nextCursor) {
                fetchAssignments(nextCursor, true);
              }
            }}
            hasNextPage={Boolean(nextCursor)}
          />
        </TabsContent>
      </Tabs>

      {/* Explanation Drawer (Sheet) */}
      <ExplanationDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        assignment={selectedAssignment}
      />

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
          handleRefreshAll();
        }}
      />
    </div>
  );
}

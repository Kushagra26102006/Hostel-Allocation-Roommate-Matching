"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  ListOrdered,
  ArrowUpDown,
  History,
  User,
  Bed,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

interface AssignmentRow {
  id: string;
  studentName: string;
  rollNo: string;
  programme: string;
  hostelName: string;
  roomNo: string;
  bedNo: string;
  preferenceRank: number;
  compatibilityScore: number;
  status: string;
  explanation: string;
  assignedAt: string;
}

export default function WardenAssignmentsPage() {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortField, setSortField] = React.useState<"studentName" | "roomNo" | "compatibilityScore">(
    "roomNo",
  );
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const [selectedAssignment, setSelectedAssignment] = React.useState<AssignmentRow | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  const initialAssignments: AssignmentRow[] = [
    {
      id: "asg-01",
      studentName: "Aarav Sharma",
      rollNo: "23CS10042",
      programme: "B.Tech CSE (Year 3)",
      hostelName: "Aryabhata Hall",
      roomNo: "A-204",
      bedNo: "Bed 1",
      preferenceRank: 1,
      compatibilityScore: 92,
      status: "allocated",
      explanation:
        "Assigned 1st preference (General Merited tier). Lifestyle compatibility with Rohan Deshmukh is 92%.",
      assignedAt: "2026-09-21 14:32 UTC",
    },
    {
      id: "asg-02",
      studentName: "Rohan Deshmukh",
      rollNo: "23CS10088",
      programme: "B.Tech CSE (Year 3)",
      hostelName: "Aryabhata Hall",
      roomNo: "A-204",
      bedNo: "Bed 2",
      preferenceRank: 1,
      compatibilityScore: 92,
      status: "allocated",
      explanation: "Mutual roommate group pairing matched into A-204 Double AC room.",
      assignedAt: "2026-09-21 14:32 UTC",
    },
    {
      id: "asg-03",
      studentName: "Dr. Priya Sundaram",
      rollNo: "25PHD001",
      programme: "Ph.D. Physics (Year 1)",
      hostelName: "Aryabhata Hall",
      roomNo: "A-101",
      bedNo: "Bed 1",
      preferenceRank: 1,
      compatibilityScore: 95,
      status: "allocated",
      explanation:
        "PwD Accessibility Priority rule enforced: Ground Floor Wheelchair unit allocated.",
      assignedAt: "2026-09-21 14:32 UTC",
    },
    {
      id: "asg-04",
      studentName: "Kabir Mehta",
      rollNo: "24ME10023",
      programme: "B.Tech ME (Year 2)",
      hostelName: "Aryabhata Hall",
      roomNo: "A-205",
      bedNo: "Bed 1",
      preferenceRank: 2,
      compatibilityScore: 84,
      status: "allocated",
      explanation: "Assigned 2nd preference choice. Sports training schedule accommodation noted.",
      assignedAt: "2026-09-21 14:32 UTC",
    },
    {
      id: "asg-05",
      studentName: "Siddharth Rao",
      rollNo: "23CS10090",
      programme: "B.Tech CSE (Year 3)",
      hostelName: "Aryabhata Hall",
      roomNo: "A-302",
      bedNo: "Bed 1",
      preferenceRank: 3,
      compatibilityScore: 64,
      status: "allocated",
      explanation:
        "Assigned 3rd preference. Flagged for review due to borderline sleep-schedule divergence.",
      assignedAt: "2026-09-21 14:32 UTC",
    },
    {
      id: "asg-06",
      studentName: "Meera Iyer",
      rollNo: "24EE10055",
      programme: "B.Tech EE (Year 2)",
      hostelName: "Gargi Hall",
      roomNo: "G-102",
      bedNo: "Bed 1",
      preferenceRank: 1,
      compatibilityScore: 94,
      status: "allocated",
      explanation: "Top tier merit rank matched to first choice single occupancy unit.",
      assignedAt: "2026-09-21 14:32 UTC",
    },
  ];

  // Filtering
  const filtered = initialAssignments.filter((a) => {
    const matchesSearch =
      a.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.roomNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (sortField === "compatibilityScore") {
      return sortOrder === "asc"
        ? a.compatibilityScore - b.compatibilityScore
        : b.compatibilityScore - a.compatibilityScore;
    }
    if (sortField === "studentName") {
      return sortOrder === "asc"
        ? a.studentName.localeCompare(b.studentName)
        : b.studentName.localeCompare(a.studentName);
    }
    return sortOrder === "asc"
      ? a.roomNo.localeCompare(b.roomNo)
      : b.roomNo.localeCompare(a.roomNo);
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / itemsPerPage);
  const paginated = sorted.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field: "studentName" | "roomNo" | "compatibilityScore") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleRowClick = (asg: AssignmentRow) => {
    setSelectedAssignment(asg);
    setIsDrawerOpen(true);
  };

  return (
    <FadeIn className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <FadeUp>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <ListOrdered className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span>Operational Assignments Master</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
          Room Assignments Ledger
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Enterprise dataset with mathematical explanations, compatibility breakdown, and bed drawer
          inspection.
        </p>
      </FadeUp>

      {/* Filter and Search Bar */}
      <FadeUp delay={0.05} className="flex flex-col sm:flex-row items-center gap-3">
        <div className="flex-1 w-full">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={(q) => {
              setSearchQuery(q);
              setCurrentPage(1);
            }}
            searchPlaceholder="Search student name, roll number, room..."
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter assignments by status"
            className="rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="allocated">Allocated</option>
            <option value="pending">Pending Review</option>
            <option value="hold">On Hold</option>
          </select>
        </div>
      </FadeUp>

      {/* Enterprise Data Table Container */}
      <FadeUp delay={0.1}>
        <GlassCard className="overflow-hidden p-0 border-border/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border/60 bg-surface-muted/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5 pl-5">
                    <button
                      type="button"
                      onClick={() => toggleSort("studentName")}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      <span>Student / Roll No</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="p-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort("roomNo")}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      <span>Hostel & Bed</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="p-3.5">Pref. Choice</th>
                  <th className="p-3.5">
                    <button
                      type="button"
                      onClick={() => toggleSort("compatibilityScore")}
                      className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                      <span>Compatibility</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No student assignments found matching your filter criteria.
                    </td>
                  </tr>
                ) : (
                  paginated.map((asg) => (
                    <tr
                      key={asg.id}
                      onClick={() => handleRowClick(asg)}
                      className="hover:bg-brand-500/5 cursor-pointer transition-colors"
                    >
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-foreground">{asg.studentName}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          {asg.rollNo} • {asg.programme}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-foreground">
                          {asg.roomNo}{" "}
                          <span className="font-normal text-muted-foreground">({asg.bedNo})</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground">{asg.hostelName}</div>
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-brand-600 dark:text-brand-400">
                          #{asg.preferenceRank} Choice
                        </span>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-heading font-bold ${
                              asg.compatibilityScore < 70 ? "text-amber-600" : "text-emerald-600"
                            }`}
                          >
                            {asg.compatibilityScore}%
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <StatusBadge status={asg.status} />
                      </td>

                      <td className="p-3.5 pr-5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(asg);
                          }}
                          className="h-8 rounded-xl text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="flex items-center justify-between border-t border-border/60 bg-surface-muted/30 px-5 py-3 text-xs text-muted-foreground">
            <div>
              Showing {sorted.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, sorted.length)} of {sorted.length} assignments
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-foreground">
                Page {currentPage} of {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="h-8 w-8 p-0 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </FadeUp>

      {/* Bed Detail Drawer (Section 27) */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md p-6 bg-surface border-border overflow-y-auto"
        >
          {selectedAssignment && (
            <div className="space-y-6">
              <SheetHeader className="text-left space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400">
                  <Bed className="h-4 w-4" />
                  <span>Bed Detail Dossier</span>
                </div>
                <SheetTitle className="text-xl font-bold text-foreground">
                  {selectedAssignment.roomNo} • {selectedAssignment.bedNo}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground">
                  {selectedAssignment.hostelName} • Block A
                </SheetDescription>
              </SheetHeader>

              {/* Student Summary */}
              <div className="rounded-2xl border border-border/80 bg-surface-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 font-bold border border-brand-200/50">
                    <User className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-foreground">
                      {selectedAssignment.studentName}
                    </h4>
                    <span className="font-mono text-xs text-muted-foreground">
                      {selectedAssignment.rollNo}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{selectedAssignment.programme}</div>
              </div>

              {/* Compatibility & Metric Breakdown */}
              <div className="space-y-3">
                <h5 className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Compatibility & Preference Scoring
                </h5>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-border/60 bg-surface-muted/40 p-3">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      Match Score
                    </span>
                    <div className="font-heading text-xl font-bold text-emerald-600 mt-0.5">
                      {selectedAssignment.compatibilityScore}%
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-surface-muted/40 p-3">
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">
                      Pref. Choice
                    </span>
                    <div className="font-heading text-xl font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                      #{selectedAssignment.preferenceRank}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mathematical Explanation */}
              <div className="rounded-xl border border-border/60 bg-surface-muted/20 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                  <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                  <span>Mathematical Allocation Rationale</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {selectedAssignment.explanation}
                </p>
              </div>

              {/* Audit History */}
              <div className="space-y-2.5">
                <h5 className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span>Ledger Audit History</span>
                </h5>
                <div className="rounded-xl border border-border/60 bg-surface-muted/20 p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>Algorithm Draft Committed</span>
                    <span className="font-mono text-[10px]">{selectedAssignment.assignedAt}</span>
                  </div>
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span>SHA-256 Checksum</span>
                    <span className="font-mono text-[10px] text-foreground">0x9a8f...4e12</span>
                  </div>
                </div>
              </div>

              {/* Drawer Actions */}
              <div className="pt-4 border-t border-border/60 flex items-center gap-2">
                <Button
                  className="flex-1 rounded-xl bg-brand-500 hover:bg-brand-600 text-white"
                  onClick={() => {
                    toast.info(
                      `Triggering override workflow for ${selectedAssignment.studentName}`,
                    );
                    setIsDrawerOpen(false);
                  }}
                >
                  Initiate Reassignment
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </FadeIn>
  );
}

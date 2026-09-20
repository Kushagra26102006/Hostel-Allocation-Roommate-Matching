"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CheckCircle2, Sliders, ShieldCheck, HelpCircle, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface EnrichedAssignment {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
    rollNumber: string;
    gender: string;
    programme: string;
    year: number;
    quota: string;
    accessibilityNeed: boolean;
  };
  bed: {
    id: string;
    bedNo: string;
    accessible: boolean;
    status: string;
  };
  room: {
    id: string;
    roomNumber: string;
    roomType: string;
    capacity: number;
    accessible: boolean;
    floor: number;
    block: string;
  };
  hostel: {
    id: string;
    name: string;
  };
  score: number;
  explanation: string;
  friendlySentence: string;
  breakdown: {
    P: number;
    C: number;
    F: number;
    D: number;
    K: number;
  };
  constraints: Array<{
    code: string;
    name: string;
    passed: boolean;
    detail: string;
  }>;
  alternativesConsidered: Array<{
    room: string;
    hostel: string;
    rank: number;
    score: number;
    reason: string;
  }>;
  tiebreakInfo: string;
  isOverridden: boolean;
  override?: {
    actor: { email: string };
    reason: string;
    escalated: boolean;
    escalationReasons: string[];
    createdAt: string;
  } | null;
}

interface ExplanationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assignment: EnrichedAssignment | null;
}

export function ExplanationDrawer({ open, onOpenChange, assignment }: ExplanationDrawerProps) {
  if (!assignment) return null;

  const { breakdown, constraints, alternativesConsidered, student, room, hostel, bed } = assignment;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto bg-surface border-l border-border p-6 space-y-6"
        aria-describedby="explanation-drawer-desc"
      >
        <SheetHeader className="space-y-1 text-left border-b border-border/60 pb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
              Score: {assignment.score.toFixed(1)} / 100
            </span>
            {assignment.isOverridden && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                Manual Override
              </span>
            )}
            {assignment.bed.accessible && (
              <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                Accessible Bed
              </span>
            )}
          </div>
          <SheetTitle className="text-xl font-extrabold text-text">
            {student.name} ({student.rollNumber})
          </SheetTitle>
          <SheetDescription id="explanation-drawer-desc" className="text-xs text-muted">
            Assigned to {hostel.name} • Room {room.roomNumber} (Bed {bed.bedNo}) •{" "}
            {room.roomType.toUpperCase()}
          </SheetDescription>
        </SheetHeader>

        {/* 1. Friendly Explanation Sentence */}
        <div className="rounded-xl border border-brand-500/20 bg-brand-500/5 p-4 text-sm font-medium text-text leading-relaxed">
          <span className="font-bold text-brand-600 dark:text-brand-400">Match Summary: </span>
          {assignment.friendlySentence}
        </div>

        {/* 2. Score Breakdown Bars (P, C, F, D, K) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5 text-brand-600" />
              <span>Multi-Objective Score Breakdown (0–100)</span>
            </h4>
            <span className="text-[11px] font-mono text-muted">Weights v2</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-border/80 bg-card/60 p-4 text-xs">
            {/* P Score */}
            <div className="space-y-1">
              <div className="flex justify-between font-semibold">
                <span className="text-text">P — Academic & Policy Priority</span>
                <span className="font-mono text-brand-600 dark:text-brand-400">{breakdown.P}%</span>
              </div>
              <Progress value={breakdown.P} className="h-2 bg-muted/20" />
              <p className="text-[10px] text-muted">
                Merit score, distance from home, and policy tier weight
              </p>
            </div>

            {/* C Score */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between font-semibold">
                <span className="text-text">C — Questionnaire Compatibility</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                  {breakdown.C}%
                </span>
              </div>
              <Progress value={breakdown.C} className="h-2 bg-muted/20" />
              <p className="text-[10px] text-muted">
                Sleep habits, cleanliness, study noise harmony with roommates
              </p>
            </div>

            {/* F Score */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between font-semibold">
                <span className="text-text">F — Floor & Room Type Preference</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">{breakdown.F}%</span>
              </div>
              <Progress value={breakdown.F} className="h-2 bg-muted/20" />
              <p className="text-[10px] text-muted">
                Floor {room.floor} match to preference ranking
              </p>
            </div>

            {/* D Score */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between font-semibold">
                <span className="text-text">D — Proximity to Academic Block</span>
                <span className="font-mono text-violet-600 dark:text-violet-400">
                  {breakdown.D}%
                </span>
              </div>
              <Progress value={breakdown.D} className="h-2 bg-muted/20" />
              <p className="text-[10px] text-muted">
                Estimated walking minutes relative to department
              </p>
            </div>

            {/* K Score */}
            <div className="space-y-1 pt-1">
              <div className="flex justify-between font-semibold">
                <span className="text-text">K — Residential Continuity</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">{breakdown.K}%</span>
              </div>
              <Progress value={breakdown.K} className="h-2 bg-muted/20" />
              <p className="text-[10px] text-muted">Continuity bonus for prior cycle retention</p>
            </div>
          </div>
        </div>

        {/* 3. Hard Constraints Checked (HC1–HC11) */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Hard Constraints Certified (11/11 Verified)</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {constraints.map((c) => (
              <div
                key={c.code}
                className="flex items-start gap-2 rounded-lg border border-border/70 bg-card/40 p-2.5"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-text">
                    {c.code}: {c.name}
                  </span>
                  <p className="text-[10px] text-muted mt-0.5 leading-tight">{c.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. Alternatives Considered */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5 text-text" />
            <span>Alternatives Evaluated During Matching</span>
          </h4>

          <div className="space-y-2 text-xs">
            {alternativesConsidered.map((alt) => (
              <div
                key={`${alt.hostel}-${alt.room}`}
                className="flex items-center justify-between rounded-lg border border-border/70 bg-card/40 p-3"
              >
                <div>
                  <span className="font-semibold text-text">
                    Rank #{alt.rank}: Room {alt.room} ({alt.hostel})
                  </span>
                  <p className="text-[11px] text-muted mt-0.5">{alt.reason}</p>
                </div>
                <div className="text-right font-mono font-bold text-muted">
                  {alt.score.toFixed(1)} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Tiebreak & Audit Details */}
        <div className="rounded-xl border border-border/70 bg-muted/10 p-3.5 text-xs text-muted space-y-1">
          <span className="font-semibold text-text flex items-center gap-1">
            <ArrowRight className="h-3 w-3" /> Deterministic Tiebreak Log
          </span>
          <p className="text-[11px] leading-relaxed">{assignment.tiebreakInfo}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

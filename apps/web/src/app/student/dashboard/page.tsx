"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Sliders,
  HelpCircle,
  Users,
  ArrowRight,
  Download,
  Info,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { useAllocationResult, useStudentGroup, useStudentPreferences } from "@/hooks/use-mock-api";
import { ExplanationPanel } from "@/components/allocation/explanation-panel";

export default function StudentDashboardPage() {
  const { data: allocation } = useAllocationResult();
  const { data: group } = useStudentGroup();
  const { data: preferences } = useStudentPreferences();
  const [showExplanation, setShowExplanation] = React.useState(false);

  // Time-of-day greeting
  const [greeting, setGreeting] = React.useState("Good morning");
  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Completion items
  const completionSteps = [
    { title: "Personal & Academic Info", completed: true, href: "/student/profile" },
    { title: "Eligibility Verification", completed: true, href: "/student/application" },
    {
      title: "Hostel Preference Ranking",
      completed: Boolean(preferences?.length),
      href: "/student/preferences",
    },
    {
      title: "Lifestyle Compatibility Questionnaire",
      completed: true,
      href: "/student/questionnaire",
    },
    {
      title: "Roommate Group Pairing",
      completed: Boolean(group?.members.length),
      href: "/student/group",
    },
  ];

  const completedCount = completionSteps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / completionSteps.length) * 100);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Greeting & Cycle Deadline */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Academic Allocation Cycle 2026–27</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {greeting}, <span className="text-brand-500">Aarav</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Roll No: 23CS10042 &bull; Year 3 B.Tech Computer Science &bull; General Merited
          </p>
        </div>

        {/* Deadline Card */}
        <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-surface p-3.5 shadow-xs">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
              Preference Lock Deadline
            </div>
            <div className="font-heading text-sm font-bold text-foreground">
              3 Days : 14 Hours Left
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Visual: Asymmetric Application Progress Hero Card */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs relative overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Progress Ring and Main Action (7 cols) */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 lg:col-span-7">
            <ProgressRing
              value={progressPercent}
              size={124}
              strokeWidth={10}
              label={`${progressPercent}%`}
              sublabel="Complete"
              className="shrink-0"
            />
            <div className="space-y-3 text-center sm:text-left flex-1">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                  Application Progress
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  {completedCount === completionSteps.length
                    ? "All steps finished and verified"
                    : `${completionSteps.length - completedCount} steps remaining for allocation`}
                </h2>
                <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                  Your hostel preferences and roommate pairing will be processed by the
                  deterministic Gale-Shapley matching algorithm.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
                <Button
                  asChild
                  size="default"
                  className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs"
                >
                  <Link href="/student/application">
                    <span>Continue Application</span>
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="default">
                  <Link href="/student/preferences">
                    <Sliders className="mr-1.5 h-4 w-4 text-muted" />
                    <span>View Rankings</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Stepper Checklist Column (5 cols) */}
          <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-4 lg:col-span-5 space-y-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted px-1">
              Checklist Status
            </div>
            <div className="space-y-1.5">
              {completionSteps.map((step, idx) => (
                <Link
                  key={idx}
                  href={step.href}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-surface transition-colors group text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    {step.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-border shrink-0" />
                    )}
                    <span className={step.completed ? "text-foreground font-medium" : "text-muted"}>
                      {step.title}
                    </span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Asymmetric Section: Confirmed Allocation & Room Details */}
      {allocation && (
        <div className="rounded-2xl border border-border/80 bg-surface overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Image Column (5 cols) */}
            <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full lg:col-span-5 bg-surface-muted overflow-hidden">
              <SmartImage
                src="/images/campus-hero.jpg"
                alt="Aryabhata Hall Residence"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="rounded-md bg-surface/90 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-foreground border border-border/60 shadow-2xs">
                  {allocation.hostelName}
                </span>
              </div>
            </div>

            {/* Details Column (7 cols) */}
            <div className="p-6 sm:p-7 flex flex-col justify-between lg:col-span-7 space-y-5">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span>Official Allocation Confirmed</span>
                  </div>
                  <StatusBadge status="allocated" />
                </div>

                <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground mt-2">
                  Room {allocation.roomNo} &bull; Bed {allocation.bedNo}
                </h3>
                <p className="text-xs sm:text-sm text-muted mt-0.5">
                  {allocation.blockName}, Floor {allocation.floorNo} &bull; Air-Conditioned Double
                  Sharing
                </p>

                {/* Meta details grid */}
                <div className="grid grid-cols-3 gap-3 mt-4">
                  <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Pref Rank</span>
                    <p className="font-heading text-sm font-bold text-brand-600 dark:text-brand-400">
                      #1 (1st Choice)
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted">
                      Roommate Match
                    </span>
                    <p className="font-heading text-sm font-bold text-foreground">92% Compatible</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-2.5">
                    <span className="text-[10px] uppercase font-bold text-muted">Verification</span>
                    <p className="font-mono text-xs font-bold text-foreground">
                      {allocation.verificationToken}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExplanation(true)}
                  className="text-xs"
                >
                  <Info className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
                  Why this room?
                </Button>

                <div className="flex items-center gap-2">
                  <Button asChild size="sm" variant="secondary" className="text-xs">
                    <Link href="/student/result">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-muted" />
                      View Allocation Letter
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="bg-brand-500 hover:bg-brand-600 text-white text-xs"
                  >
                    <Link href="/student/result">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download PDF
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Bottom Grid: Roommate Group, Preferences, and Lifestyle Questionnaire */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Roommate Group Card */}
        <div className="rounded-xl border border-border/70 bg-surface p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                <Users className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                Paired (2/2)
              </span>
            </div>
            <h4 className="font-heading text-base font-bold text-foreground mt-3">
              Roommate Group
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Code: <span className="font-mono font-semibold text-foreground">RM-4089</span>
            </p>

            <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Rohan Deshmukh</span>
                <span className="text-[11px] font-semibold text-emerald-600">92% Match</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">Aarav Sharma (You)</span>
                <span className="text-[11px] text-muted">Group Leader</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              href="/student/group"
              className="inline-flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              <span>Manage Roommate Group</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Preferences Ranking Card */}
        <div className="rounded-xl border border-border/70 bg-surface p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                <Sliders className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-bold text-muted border border-border/60">
                3 Ranked
              </span>
            </div>
            <h4 className="font-heading text-base font-bold text-foreground mt-3">
              Hostel Rankings
            </h4>
            <p className="text-xs text-muted mt-0.5">Prioritized residences for allocation</p>

            <div className="mt-4 space-y-1.5 border-t border-border/50 pt-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-brand-600">1.</span>
                <span className="font-medium text-foreground">Aryabhata Hall (AC Double)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted">2.</span>
                <span className="text-muted">Ramanujan Tower (Single)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-muted">3.</span>
                <span className="text-muted">Gargi Residence (Double)</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              href="/student/preferences"
              className="inline-flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              <span>Reorder Preferences</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Compatibility Questionnaire Card */}
        <div className="rounded-xl border border-border/70 bg-surface p-5 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                <HelpCircle className="h-4.5 w-4.5" />
              </div>
              <span className="rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                100% Complete
              </span>
            </div>
            <h4 className="font-heading text-base font-bold text-foreground mt-3">
              Lifestyle Survey
            </h4>
            <p className="text-xs text-muted mt-0.5">Privacy-preserving habits matching</p>

            <div className="mt-4 space-y-1.5 border-t border-border/50 pt-3 text-xs text-muted">
              <div className="flex items-center justify-between">
                <span>Sleep Schedule:</span>
                <span className="font-medium text-foreground">Night Owl (1 AM)</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Study Atmosphere:</span>
                <span className="font-medium text-foreground">Quiet environment</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Cleanliness:</span>
                <span className="font-medium text-foreground">High standard</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              href="/student/questionnaire"
              className="inline-flex items-center text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline"
            >
              <span>Review Survey Answers</span>
              <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Explanation Side Drawer */}
      <ExplanationPanel open={showExplanation} onClose={() => setShowExplanation(false)} />
    </div>
  );
}

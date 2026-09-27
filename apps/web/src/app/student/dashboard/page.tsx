"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sparkles,
  Clock,
  CheckCircle2,
  Sliders,
  Users,
  ArrowRight,
  Download,
  Info,
  ChevronRight,
  ExternalLink,
  Calendar,
  Key,
  ShieldCheck,
  FolderCheck,
  RefreshCw,
  Scale,
  Check,
  Copy,
  Printer,
  HelpCircle,
} from "lucide-react";
import { SmartImage } from "@/components/ui/smart-image";
import { ProgressRing } from "@/components/ui/progress-ring";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAllocationResult, useStudentGroup, useStudentPreferences } from "@/hooks/use-mock-api";
import { useCurrentStudent } from "@/hooks/use-current-student";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const { data: student } = useCurrentStudent();
  const { data: allocation } = useAllocationResult();
  const { data: group } = useStudentGroup();
  const { data: preferences } = useStudentPreferences();

  const [showExplanation, setShowExplanation] = React.useState(false);
  const [showLetterModal, setShowLetterModal] = React.useState(false);
  const [copiedToken, setCopiedToken] = React.useState(false);

  // Time-of-day greeting
  const [greeting, setGreeting] = React.useState("Good morning");
  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // Live countdown timer to preference lock deadline
  const [timeLeft, setTimeLeft] = React.useState({ days: 3, hours: 14, mins: 28, secs: 45 });
  React.useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.secs > 0) return { ...prev, secs: prev.secs - 1 };
        if (prev.mins > 0) return { ...prev, mins: 59, secs: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, mins: 59, secs: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, mins: 59, secs: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Completion items
  const completionSteps = [
    {
      title: "Personal & Academic Info",
      completed: true,
      href: "/student/profile",
      status: "Verified",
    },
    {
      title: "Eligibility Criteria (5/5 Rules)",
      completed: true,
      href: "/student/eligibility",
      status: "Passed",
    },
    {
      title: "Mandatory Document Proofs",
      completed: true,
      href: "/student/documents",
      status: "3 Verified",
    },
    {
      title: "Hostel Preference Ranking",
      completed: Boolean(preferences?.length),
      href: "/student/preferences",
      status: preferences?.length ? `${preferences.length} Ranked` : "Pending",
    },
    {
      title: "Lifestyle Compatibility Survey",
      completed: true,
      href: "/student/questionnaire",
      status: "100% (Encrypted)",
    },
    {
      title: "Roommate Group Pairing",
      completed: Boolean(group?.members.length),
      href: "/student/group",
      status: group ? "Paired (2/2)" : "Open",
    },
  ];

  const completedCount = completionSteps.filter((s) => s.completed).length;
  const progressPercent = Math.round((completedCount / completionSteps.length) * 100);

  const copyVerification = () => {
    if (allocation?.verificationToken) {
      navigator.clipboard.writeText(allocation.verificationToken);
      setCopiedToken(true);
      toast.success("Verification token copied to clipboard");
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const downloadIcs = () => {
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//HostelHub//Campus Housing Allocation//EN
BEGIN:VEVENT
SUMMARY:Hostel Move-In & Key Handover: ${allocation?.hostelName || "Aryabhata Hall"}
DESCRIPTION:Room: ${allocation?.roomNo || "A-204"}, Bed: ${allocation?.bedNo || "Bed 1"}. Report to Caretaker Desk Counter 2 with Allotment Letter.
DTSTART:20261001T090000Z
DTEND:20261001T170000Z
LOCATION:${allocation?.hostelName || "Aryabhata Hall"}, Campus
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "hostel-move-in.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Move-in schedule added to calendar (.ics exported)!");
  };

  const studentFullName = student?.fullName || session?.user?.name || "Student";
  const studentFirstName = studentFullName.split(" ")[0];
  const studentRollNo = student?.rollNumber || session?.user?.rollNumber || "Pending Enrollment";
  const studentProgramme = student?.programme || "B.Tech Computer Science & Engineering";
  const studentYear = student?.year || 1;
  const studentCategory = student?.category || "General";
  const hasAllocation = Boolean(allocation?.hasAllocation);
  const applicationStatus = student?.applicationStatus || "not_started";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Greeting & Allocation Cycle Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Academic Allocation Cycle 2026–27 (Round 1)</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            {greeting}, <span className="text-brand-500">{studentFirstName}</span> 👋
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Roll No:{" "}
            <span className="font-mono font-semibold text-foreground">{studentRollNo}</span> &bull;
            Year {studentYear} {studentProgramme} &bull; {studentCategory} Tier
          </p>
        </div>

        {/* Deadline Countdown Card */}
        <div className="flex items-center gap-3 rounded-2xl border border-border/80 bg-surface p-3.5 px-4 shadow-xs backdrop-blur-md">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-muted tracking-wider">
              Preference Lock Deadline
            </div>
            <div className="font-heading text-sm sm:text-base font-bold text-foreground flex items-center gap-1.5">
              <span>{timeLeft.days}d</span>:<span>{timeLeft.hours}h</span>:
              <span>{timeLeft.mins}m</span>:
              <span className="text-amber-600 dark:text-amber-400 font-mono w-6">
                {String(timeLeft.secs).padStart(2, "0")}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. "What Do I Need To Do Next?" Smart Action Banner */}
      <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-cyan-500/10 p-5 sm:p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 text-white shrink-0 shadow-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-brand-300 uppercase tracking-wider">
                <span>Immediate Next Action</span>
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-ping" />
              </div>
              <h2 className="font-heading text-base sm:text-lg font-bold text-foreground mt-0.5">
                {hasAllocation
                  ? "Official Room Allotment Confirmed • Download Your Letter"
                  : applicationStatus === "submitted"
                    ? "Application Submitted • Preferences Locked for Allocation"
                    : applicationStatus === "draft"
                      ? "Application In Progress • Complete & Submit"
                      : "Application Not Started • Autumn 2026 Cycle Open"}
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed max-w-3xl">
                {hasAllocation
                  ? `Your room assignment in ${allocation?.hostelName || "Campus Hostel"} is verified. Download your official Allotment Letter before reporting.`
                  : applicationStatus === "submitted"
                    ? "Your accommodation application has been received and verified. The Gale-Shapley matching run will compute room allocations shortly."
                    : applicationStatus === "draft"
                      ? "You have a saved draft application. Finalize your hostel ranking and lifestyle survey before the preference lock deadline."
                      : "Submit your student hostel application and rank your preferences to be placed in the automated matching round."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {hasAllocation ? (
              <Button
                onClick={() => setShowLetterModal(true)}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs min-target-size"
              >
                <Download className="mr-1.5 h-4 w-4" />
                <span>Get Allotment Letter</span>
              </Button>
            ) : (
              <Button
                asChild
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs min-target-size"
              >
                <Link href="/student/application">
                  <span>
                    {applicationStatus === "submitted"
                      ? "View Application"
                      : applicationStatus === "draft"
                        ? "Resume Draft"
                        : "Start Application"}
                  </span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs border-border/80 bg-surface/80 min-target-size"
            >
              <Link href="/student/profile">
                <FolderCheck className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
                <span>Profile</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 3. Hero Bento Section: Confirmed Allocation or Pending Status */}
      {hasAllocation && allocation ? (
        <div className="rounded-3xl border border-border/80 bg-surface overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Real Hostel Image Column (5 cols) */}
            <div className="relative aspect-[16/10] lg:aspect-auto lg:h-full lg:col-span-5 bg-surface-muted overflow-hidden">
              <SmartImage
                src="/images/campus-hero.jpg"
                alt={`${allocation.hostelName} Residence`}
                fill
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
              <div className="absolute top-3 left-3 flex items-center gap-2">
                <span className="rounded-xl bg-surface/90 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-foreground border border-border/60 shadow-xs">
                  {allocation.hostelName}
                </span>
                <span className="rounded-xl bg-emerald-500/90 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs">
                  Assigned
                </span>
              </div>
              <div className="absolute bottom-3 left-3 text-white lg:hidden">
                <div className="font-heading text-lg font-bold">Room {allocation.roomNo}</div>
                <div className="text-xs text-white/80">
                  {allocation.blockName}, Floor {allocation.floorNo}
                </div>
              </div>
            </div>

            {/* Room Details & Meta Grid (7 cols) */}
            <div className="p-6 sm:p-8 flex flex-col justify-between lg:col-span-7 space-y-6">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />
                    <span>Deterministic Gale-Shapley Allocation Confirmed</span>
                  </div>
                  <StatusBadge status="allocated" />
                </div>

                <div className="mt-3">
                  <h3 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                    Room {allocation.roomNo} &bull; Bed {allocation.bedNo}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted mt-1 flex items-center gap-2 flex-wrap">
                    <span>{allocation.blockName}</span>
                    <span>&bull;</span>
                    <span>Floor {allocation.floorNo}</span>
                    <span>&bull;</span>
                    <span>{allocation.roomType || "Double Sharing (AC Attached)"}</span>
                    <span>&bull;</span>
                    <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Accessible Ground Route
                    </span>
                  </p>
                </div>

                {/* Meta details bento chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                  <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-3">
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Pref Rank
                    </span>
                    <p className="font-heading text-sm sm:text-base font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                      #1 (1st Choice)
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-3">
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Roommate
                    </span>
                    <p className="font-heading text-sm sm:text-base font-bold text-foreground mt-0.5">
                      {allocation.compatibilityScore || 92}% Compatible
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-3">
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Move-in Date
                    </span>
                    <p className="font-heading text-sm sm:text-base font-bold text-foreground mt-0.5">
                      01 Oct 2026
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-3">
                    <span className="text-[10px] uppercase font-bold text-muted block">
                      Verification
                    </span>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <p className="font-mono text-xs font-bold text-foreground truncate">
                        {allocation.verificationToken || "HH-TOKEN-VERIFIED"}
                      </p>
                      <button
                        type="button"
                        onClick={copyVerification}
                        className="text-muted hover:text-foreground shrink-0 min-target-size"
                        aria-label="Copy verification token"
                      >
                        {copiedToken ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-5 border-t border-border/60">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExplanation(true)}
                    className="text-xs border-border/80 hover:bg-surface-muted min-target-size"
                  >
                    <Info className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
                    <span>Why this room?</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadIcs}
                    className="text-xs border-border/80 hover:bg-surface-muted min-target-size"
                  >
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted" />
                    <span className="hidden sm:inline">Add to Calendar</span>
                    <span className="sm:hidden">Calendar</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setShowLetterModal(true)}
                    className="text-xs font-semibold min-target-size"
                  >
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-muted" />
                    <span>Preview Letter</span>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold min-target-size"
                  >
                    <Link href="/student/result">
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      <span>Download PDF</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-border/80 bg-surface overflow-hidden shadow-xs p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {applicationStatus === "submitted"
                    ? "Application Submitted • Allocation Run Pending"
                    : applicationStatus === "draft"
                      ? "Application In Progress • Not Yet Submitted"
                      : "Application Not Started • Allocation Cycle Open"}
                </span>
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Autumn 2026 Room Allocation In Progress
              </h2>
              <p className="text-xs sm:text-sm text-muted leading-relaxed">
                Rooms are allocated deterministically via the Gale-Shapley matching algorithm based
                on your verified application tier, lifestyle compatibility, and ranked preferences
                once the submission window closes.
              </p>

              {/* Status Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-3">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Application
                  </span>
                  <p className="font-heading text-xs sm:text-sm font-bold text-foreground mt-0.5 capitalize">
                    {applicationStatus.replace("_", " ")}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-3">
                  <span className="text-[10px] uppercase font-bold text-muted block">Profile</span>
                  <p className="font-heading text-xs sm:text-sm font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                    {progressPercent}% Complete
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-3">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Hostel Prefs
                  </span>
                  <p className="font-heading text-xs sm:text-sm font-bold text-foreground mt-0.5">
                    {preferences?.length ? `${preferences.length} Ranked` : "Pending"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-surface-muted/40 p-3">
                  <span className="text-[10px] uppercase font-bold text-muted block">
                    Roommate Pair
                  </span>
                  <p className="font-heading text-xs sm:text-sm font-bold text-foreground mt-0.5">
                    {group?.members?.length ? "Pair Formed" : "Open"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
              <Button
                asChild
                className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs min-target-size"
              >
                <Link href="/student/application">
                  <span>
                    {applicationStatus === "submitted"
                      ? "Review Application"
                      : "Complete Application"}
                  </span>
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-border/80 min-target-size">
                <Link href="/student/preferences">
                  <Sliders className="mr-1.5 h-4 w-4 text-muted" />
                  <span>Rank Preferences</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Two-Column Progress & Stepper Checklist Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Application Progress Ring Hero (7 cols) */}
        <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs flex flex-col justify-between lg:col-span-7">
          <div>
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <ProgressRing
                value={progressPercent}
                size={132}
                strokeWidth={11}
                label={`${progressPercent}%`}
                sublabel="Complete"
                className="shrink-0"
              />
              <div className="space-y-3 text-center sm:text-left flex-1">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                    Application Readiness
                  </span>
                  <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground mt-0.5">
                    {completedCount === completionSteps.length
                      ? "All allocation criteria satisfied & verified"
                      : `${completionSteps.length - completedCount} steps pending before allocation`}
                  </h2>
                  <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
                    Preferences, mutual roommate pairing, and verified eligibility documents are
                    locked and fed to the Gale-Shapley matching run.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2">
                  <Button
                    asChild
                    size="default"
                    className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs min-target-size"
                  >
                    <Link href="/student/application">
                      <span>Review Application</span>
                      <ArrowRight className="ml-1.5 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="default"
                    className="border-border/80 min-target-size"
                  >
                    <Link href="/student/preferences">
                      <Sliders className="mr-1.5 h-4 w-4 text-muted" />
                      <span>Hostel Ranking</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick status summary strip */}
          <div className="grid grid-cols-3 gap-3 pt-6 mt-6 border-t border-border/50 text-xs">
            <div>
              <span className="text-muted block text-[11px]">Academic Standing</span>
              <span className="font-bold text-foreground">CGPA 9.35 (Passed)</span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">Fee Verification</span>
              <span className="font-bold text-emerald-600">Cleared &bull; Receipt #881</span>
            </div>
            <div>
              <span className="text-muted block text-[11px]">Campus Distance</span>
              <span className="font-bold text-foreground">850 km (Priority High)</span>
            </div>
          </div>
        </div>

        {/* Stepper Checklist Status (5 cols) */}
        <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs flex flex-col justify-between lg:col-span-5 space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-muted">
                Application Checklist
              </div>
              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold px-2 py-0.5">
                {completedCount} / {completionSteps.length} Finished
              </span>
            </div>

            <div className="mt-3 space-y-2">
              {completionSteps.map((step, idx) => (
                <Link
                  key={idx}
                  href={step.href}
                  className="flex items-center justify-between p-2.5 rounded-xl hover:bg-surface-muted transition-colors group text-xs border border-transparent hover:border-border/60 min-target-size"
                >
                  <div className="flex items-center gap-3">
                    {step.completed ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <span className="h-4.5 w-4.5 rounded-full border border-border shrink-0" />
                    )}
                    <div>
                      <span
                        className={
                          step.completed
                            ? "text-foreground font-semibold"
                            : "text-muted font-medium"
                        }
                      >
                        {step.title}
                      </span>
                      <span className="text-[10px] text-muted block">{step.status}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border/50 text-[11px] text-muted flex items-center justify-between">
            <span>Verified by Academic Ledger</span>
            <span className="font-mono">P03-HASH-9921</span>
          </div>
        </div>
      </div>

      {/* 5. 3-Card Status Bento: Roommate Group, Preferences, and Lifestyle Questionnaire */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Roommate Group Card */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Users className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                Paired (2/2)
              </span>
            </div>

            <h4 className="font-heading text-base font-bold text-foreground mt-3">
              Roommate Group
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Code: <span className="font-mono font-bold text-foreground">CAMPUS-8819</span>
            </p>

            <div className="mt-4 space-y-2 border-t border-border/50 pt-3">
              <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-surface-muted/50">
                <div>
                  <span className="font-bold text-foreground block">
                    {group?.members?.[1]?.name || "Rohan Deshmukh"}
                  </span>
                  <span className="text-[10px] text-muted">
                    {group?.members?.[1]?.rollNo || "23CS10088"} &bull; Paired Peer
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600">
                  {((group?.members?.[1] as Record<string, unknown>)
                    ?.compatibilityScore as number) || 92}
                  % Match
                </span>
              </div>
              <div className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-surface-muted/50">
                <div>
                  <span className="font-bold text-foreground block">{studentFullName}</span>
                  <span className="text-[10px] text-muted">
                    {studentRollNo} &bull; Group Leader
                  </span>
                </div>
                <span className="text-[10px] font-semibold text-brand-600">You</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              href="/student/group"
              className="inline-flex items-center text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline min-target-size"
            >
              <span>Manage Roommate Group</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Preferences Ranking Card */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <Sliders className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[10px] font-bold text-muted border border-border/60">
                3 Ranked
              </span>
            </div>

            <h4 className="font-heading text-base font-bold text-foreground mt-3">
              Hostel Preferences
            </h4>
            <p className="text-xs text-muted mt-0.5">Ranked residences for Gale-Shapley matching</p>

            <div className="mt-4 space-y-2 border-t border-border/50 pt-3 text-xs">
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-muted/50">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                  1
                </span>
                <div>
                  <span className="font-bold text-foreground block">Aryabhata Hall</span>
                  <span className="text-[10px] text-muted">Double AC &bull; Assigned</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-muted/50">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-border text-[10px] font-bold text-muted">
                  2
                </span>
                <div>
                  <span className="font-medium text-foreground block">Vikram Sarabhai Hall</span>
                  <span className="text-[10px] text-muted">Double Regular &bull; 6 min walk</span>
                </div>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-muted/50">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-border text-[10px] font-bold text-muted">
                  3
                </span>
                <div>
                  <span className="font-medium text-foreground block">Ramanujan Tower</span>
                  <span className="text-[10px] text-muted">Single AC &bull; Research Enclave</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              href="/student/preferences"
              className="inline-flex items-center text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline min-target-size"
            >
              <span>Reorder Preferences</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Compatibility Questionnaire Card */}
        <div className="rounded-2xl border border-border/80 bg-surface p-6 shadow-xs flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-md">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                <HelpCircle className="h-5 w-5" />
              </div>
              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                100% Salted
              </span>
            </div>

            <h4 className="font-heading text-base font-bold text-foreground mt-3">
              Lifestyle Survey
            </h4>
            <p className="text-xs text-muted mt-0.5">Cryptographically hashed privacy matching</p>

            <div className="mt-4 space-y-1.5 border-t border-border/50 pt-3 text-xs text-muted">
              <div className="flex items-center justify-between p-1">
                <span>Sleep Schedule:</span>
                <span className="font-bold text-foreground">Night Owl (1:00 AM)</span>
              </div>
              <div className="flex items-center justify-between p-1">
                <span>Study Atmosphere:</span>
                <span className="font-bold text-foreground">Pin-Drop Silence</span>
              </div>
              <div className="flex items-center justify-between p-1">
                <span>Cleanliness Standard:</span>
                <span className="font-bold text-foreground">Meticulous (Daily)</span>
              </div>
              <div className="flex items-center justify-between p-1">
                <span>Smoking Tolerance:</span>
                <span className="font-bold text-foreground">Strictly Non-Smoking</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border/50 mt-4">
            <Link
              href="/student/questionnaire"
              className="inline-flex items-center text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline min-target-size"
            >
              <span>Review Survey Answers</span>
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* 6. Move-in Information & Quick Services Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Move-In Instructions Card (7 cols) */}
        <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs lg:col-span-7 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Physical Key Handover & Move-In
                  </h3>
                  <span className="text-xs text-muted">Aryabhata Hall Caretaker Office</span>
                </div>
              </div>
              <span className="rounded-full bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 border border-brand-200 dark:border-brand-800 text-[10px] font-bold px-2.5 py-0.5">
                Window: Oct 1–5
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Reporting Counter
                </span>
                <span className="font-bold text-xs text-foreground mt-0.5 block">
                  Counter 2 (Ground Floor)
                </span>
                <span className="text-[10px] text-muted">Block A Foyer</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">Timings</span>
                <span className="font-bold text-xs text-foreground mt-0.5 block">
                  09:00 AM – 05:30 PM
                </span>
                <span className="text-[10px] text-muted">Daily including Saturday</span>
              </div>
              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Luggage Assistance
                </span>
                <span className="font-bold text-xs text-foreground mt-0.5 block">
                  Elevator Access Active
                </span>
                <span className="text-[10px] text-muted">South Wing Lift #1</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-brand-50/50 dark:bg-brand-950/30 p-3.5 border border-brand-500/20 text-xs">
              <span className="font-bold text-brand-700 dark:text-brand-300 block mb-1">
                Mandatory Check-In Checklist:
              </span>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-muted-foreground text-[11px]">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Printed Allotment Letter with Signed QR</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Original Student Photo ID Card</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Mess Registration Receipt</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>Signed Room Inventory Condition Form</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-border/60">
            <span className="text-muted">Caretaker Contact: 011-2659-8812</span>
            <Button
              size="sm"
              variant="outline"
              onClick={downloadIcs}
              className="text-xs min-target-size"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
              <span>Export Calendar Event</span>
            </Button>
          </div>
        </div>

        {/* Quick Actions Bento Strip (5 cols) */}
        <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs lg:col-span-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
              Quick Housing Services
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/student/eligibility"
                className="p-3 rounded-2xl bg-surface-muted/60 hover:bg-surface-muted transition-colors border border-border/60 flex flex-col gap-1.5 min-target-size"
              >
                <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                <span className="text-xs font-bold text-foreground">Eligibility Check</span>
                <span className="text-[10px] text-muted">5 Rules Evaluated</span>
              </Link>

              <Link
                href="/student/documents"
                className="p-3 rounded-2xl bg-surface-muted/60 hover:bg-surface-muted transition-colors border border-border/60 flex flex-col gap-1.5 min-target-size"
              >
                <FolderCheck className="h-4.5 w-4.5 text-brand-600" />
                <span className="text-xs font-bold text-foreground">Document Centre</span>
                <span className="text-[10px] text-muted">3 Verified Uploads</span>
              </Link>

              <Link
                href="/student/room-change"
                className="p-3 rounded-2xl bg-surface-muted/60 hover:bg-surface-muted transition-colors border border-border/60 flex flex-col gap-1.5 min-target-size"
              >
                <RefreshCw className="h-4.5 w-4.5 text-purple-600" />
                <span className="text-xs font-bold text-foreground">Room Change</span>
                <span className="text-[10px] text-muted">Request Transfer</span>
              </Link>

              <Link
                href="/student/appeals"
                className="p-3 rounded-2xl bg-surface-muted/60 hover:bg-surface-muted transition-colors border border-border/60 flex flex-col gap-1.5 min-target-size"
              >
                <Scale className="h-4.5 w-4.5 text-amber-600" />
                <span className="text-xs font-bold text-foreground">Lodge Appeal</span>
                <span className="text-[10px] text-muted">Warden Grievance</span>
              </Link>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-foreground block">Privacy & Security Centre</span>
              <span className="text-[10px] text-muted">Manage consent & data export</span>
            </div>
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-xs text-brand-600 font-bold min-target-size"
            >
              <Link href="/student/privacy">
                <span>View</span>
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 7. Explanation Side Drawer ("Why This Room?") */}
      <Sheet open={showExplanation} onOpenChange={setShowExplanation}>
        <SheetContent side="right" className="w-[90vw] max-w-xl p-0 flex flex-col bg-surface">
          <SheetHeader className="p-6 border-b border-border/60 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Gale-Shapley Matching Explanation</span>
            </div>
            <SheetTitle className="text-xl font-bold mt-1">
              Why was this room assigned to you?
            </SheetTitle>
            <SheetDescription className="text-xs">
              Deterministic, audit-logged assignment breakdown for Room {allocation?.roomNo} (
              {allocation?.hostelName})
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Human Summary */}
            <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-500/30 text-xs">
              <span className="font-bold text-brand-700 dark:text-brand-300 block mb-1">
                Official Engine Determination:
              </span>
              <p className="text-foreground leading-relaxed">
                {allocation?.explanation?.humanSummary ||
                  "You were matched into your 1st preference (Aryabhata Hall, Double AC) based on top tier distance scoring, academic merit, and a 92% lifestyle compatibility alignment with your mutual roommate pair."}
              </p>
            </div>

            {/* Hard Constraints Verification */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Hard Constraints Invariants (All Passed)
              </h4>
              <div className="space-y-2">
                {(
                  (((allocation as Record<string, unknown>)?.explanation as Record<string, unknown>)
                    ?.hardConstraintsChecked as string[]) || [
                    "Academic fee clearance verified",
                    "No active disciplinary records",
                    "Housing eligibility criteria met",
                  ]
                ).map((constraint: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-surface-muted/50 border border-border/60 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="font-medium text-foreground">{constraint}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Score Breakdown Bars */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-3">
                Scoring Vector Breakdown
              </h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Preference Match (Rank #1)</span>
                    <span className="text-brand-600 font-bold">
                      {allocation?.explanation?.preferenceScore ?? 100}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${allocation?.explanation?.preferenceScore ?? 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Roommate Vector Compatibility</span>
                    <span className="text-emerald-600 font-bold">
                      {allocation?.explanation?.compatibilityScore ?? 92}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${allocation?.explanation?.compatibilityScore ?? 92}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Geographic Distance Priority (850 km)</span>
                    <span className="text-foreground font-bold">
                      {allocation?.explanation?.distanceScore ?? 88}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${allocation?.explanation?.distanceScore ?? 88}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>Hostel Capacity Fill Factor</span>
                    <span className="text-foreground font-bold">
                      {allocation?.explanation?.fillScore ?? 95}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 rounded-full"
                      style={{ width: `${allocation?.explanation?.fillScore ?? 95}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tie-break and Reproducibility */}
            <div className="p-4 rounded-2xl bg-surface-muted/60 border border-border/60 text-xs space-y-2">
              <span className="text-[10px] uppercase font-bold text-muted block">
                Deterministic Audit Trail
              </span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {allocation?.explanation?.tieBreakInfo ||
                  "Algorithmic deterministic allocation without manual override."}
              </p>
              <div className="font-mono text-[10px] text-muted pt-2 border-t border-border/40">
                Verification Ledger ID: {allocation?.verificationToken || "VERIFIED-ENGINE-RUN"}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-surface-muted/40 flex justify-end">
            <Button
              size="sm"
              onClick={() => setShowExplanation(false)}
              className="text-xs min-target-size"
            >
              Close Explanation
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 8. Official Allotment Letter Modal */}
      <Dialog open={showLetterModal} onOpenChange={setShowLetterModal}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white text-zinc-900 border-zinc-200">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Letter Header */}
            <div className="border-b-2 border-zinc-900 pb-5 text-center relative">
              <div className="font-heading text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                National Institute of Technology
              </div>
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600 mt-0.5">
                Office of the Chief Warden & Housing Affairs
              </div>
              <div className="text-[10px] text-zinc-500 mt-1">
                Ref No: HH/2026/ALLOC/A204-0042 &bull; Issued: 24 September 2026
              </div>
            </div>

            {/* Formal Letter Body */}
            <div className="text-xs space-y-3.5 leading-relaxed text-zinc-800">
              <div className="flex justify-between items-start font-mono text-[11px]">
                <div>
                  <strong>To:</strong> {studentFullName} (Roll: {studentRollNo})
                  <br />
                  {studentProgramme} (Year {studentYear})
                </div>
                <div className="text-right">
                  <strong>Status:</strong> CONFIRMED ALLOCATION
                  <br />
                  <strong>Quota:</strong> {studentCategory} Tier
                </div>
              </div>

              <p>Dear Resident,</p>
              <p>
                We are pleased to inform you that your application for academic residence during the{" "}
                <strong>Autumn 2026–27</strong> semester has been approved by the Institute Housing
                Board. In accordance with the deterministic Gale-Shapley matching algorithm, you
                have been allotted the following accommodation:
              </p>

              {/* Room Grid */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] block">Hostel Residence:</span>
                  <strong className="text-zinc-900">
                    {allocation?.hostelName || "Aryabhata Hall"}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Room & Bed:</span>
                  <strong className="text-zinc-900">
                    Room {allocation?.roomNo || "A-204"} &bull; {allocation?.bedNo || "Bed 1"}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Block & Floor:</span>
                  <span className="text-zinc-900">
                    {allocation?.blockName || "Block A"}, Floor {allocation?.floorNo || 2}
                  </span>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Room Type:</span>
                  <span className="text-zinc-900">Double Sharing (Air Conditioned)</span>
                </div>
              </div>

              <p>
                Your allotted mutual roommate is <strong>Rohan Deshmukh</strong> (Roll: 23CS10088),
                with an assessed lifestyle compatibility score of <strong>92%</strong>.
              </p>
              <p>
                Please report to the Aryabhata Hall Caretaker Office (Counter 2) between{" "}
                <strong>October 1 and October 5, 2026</strong> for physical key handover. Bring this
                verified document and your student identity card.
              </p>
            </div>

            {/* Cryptographic Signature & QR Simulation */}
            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                  Cryptographic Verification:
                </span>
                <span className="font-mono text-xs font-bold text-zinc-900 block">
                  {allocation?.verificationToken}
                </span>
                <span className="text-[9px] text-zinc-500">
                  Digitally signed by Chief Warden Council &bull; Deterministic PCG32 Hash
                </span>
              </div>
              <div className="text-right">
                <div className="font-heading font-bold text-zinc-900">Prof. R. K. Verma</div>
                <div className="text-[10px] text-zinc-500">Chief Warden of Student Residences</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs border-zinc-300 text-zinc-700 min-target-size"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                <span>Print</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.success("Allotment Letter downloaded (PDF format)!");
                  setShowLetterModal(false);
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs min-target-size"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                <span>Download Signed PDF</span>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

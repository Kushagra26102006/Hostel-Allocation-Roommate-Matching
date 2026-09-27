"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { SmartImage } from "@/components/ui/smart-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from "next/link";
import { useAllocationResult } from "@/hooks/use-mock-api";
import { useCurrentStudent } from "@/hooks/use-current-student";
import { useSession } from "next-auth/react";
import {
  Sparkles,
  Download,
  HelpCircle,
  CheckCircle2,
  Printer,
  Users,
  ExternalLink,
  Calendar,
  Check,
  Copy,
  ShieldCheck,
  Wind,
  Clock,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import confetti from "canvas-confetti";

interface RoommateInfo {
  name?: string;
  rollNo?: string;
  programme?: string;
  department?: string;
  compatibilityScore?: number;
  contact?: string;
}

export default function StudentAllocationResultPage() {
  const { data: session } = useSession();
  const { data: student } = useCurrentStudent();
  const { data: result } = useAllocationResult();
  const [isWhyDrawerOpen, setIsWhyDrawerOpen] = React.useState(false);
  const [isLetterModalOpen, setIsLetterModalOpen] = React.useState(false);
  const [copiedToken, setCopiedToken] = React.useState(false);
  const [revealStep, setRevealStep] = React.useState(0);

  // Staged reveal sequence and celebration confetti on mount
  React.useEffect(() => {
    const t1 = setTimeout(() => {
      setRevealStep(1);
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ["#3155FF", "#06B6D4", "#10B981", "#8B5CF6"],
        });
      } catch {
        // ignore
      }
    }, 200);
    const t2 = setTimeout(() => setRevealStep(2), 500);
    const t3 = setTimeout(() => setRevealStep(3), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const copyToken = () => {
    if (result?.verificationToken) {
      navigator.clipboard.writeText(result.verificationToken);
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
SUMMARY:Hostel Move-In: ${result?.hostelName || "Aryabhata Hall"}
DESCRIPTION:Room: ${result?.roomNo || "A-204"}, Bed: ${result?.bedNo || "Bed 1"}. Report to Caretaker Desk Counter 2 with Allotment Letter.
DTSTART:20261001T090000Z
DTEND:20261001T170000Z
LOCATION:${result?.hostelName || "Aryabhata Hall"}, Campus
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "allotment-move-in.ics");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Move-in schedule exported to calendar (.ics)!");
  };

  if (!result) return null;

  if (!result.hasAllocation) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
        <div className="rounded-3xl border border-border/80 bg-surface p-8 sm:p-10 shadow-xs text-center space-y-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Clock className="h-8 w-8" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Allocation Pending Allotment Run</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
              No Active Room Allocation Yet
            </h1>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Hi {student?.fullName || session?.user?.name || "Student"}, your official room
              assignment will appear here as soon as the Chief Warden runs the deterministic
              Gale-Shapley matching engine.
            </p>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Button
              asChild
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs min-target-size"
            >
              <Link href="/student/application">
                <span>Check Application Status</span>
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-border/80 min-target-size">
              <Link href="/student/preferences">
                <span>View Preferences</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="border-border/80 min-target-size">
              <Link href="/student/dashboard">
                <span>Back to Dashboard</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Hero Reveal Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-brand-500/5 to-cyan-500/10 p-6 sm:p-8 shadow-xs"
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Official Allocation Confirmed &bull; Published by Chief Warden</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {result.hostelName} &bull; Room {result.roomNo}
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              {result.blockName} &bull; Floor {result.floorNo} &bull; {result.bedNo} &bull; Double
              Sharing (AC Attached)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            <Button
              onClick={() => setIsLetterModalOpen(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs min-target-size"
            >
              <Download className="mr-1.5 h-4 w-4" />
              <span>Allocation Letter</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsWhyDrawerOpen(true)}
              className="border-border/80 bg-surface/80 text-xs min-target-size"
            >
              <HelpCircle className="mr-1.5 h-4 w-4 text-brand-600" />
              <span>Why this room?</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 2. Bento Grid: Photography & Specifications */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Real Photography & Specifications (7 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: revealStep >= 1 ? 1 : 0, y: revealStep >= 1 ? 0 : 15 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-border/80 bg-surface overflow-hidden shadow-xs flex flex-col justify-between lg:col-span-7"
        >
          {/* Real Photo */}
          <div className="relative aspect-[16/10] bg-surface-muted overflow-hidden">
            <SmartImage
              src="/images/campus-hero.jpg"
              alt="Aryabhata Hall Residence"
              fill
              priority
              className="object-cover"
            />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="rounded-xl bg-surface/90 backdrop-blur-md px-3 py-1.5 text-xs font-bold text-foreground border border-border/60 shadow-xs">
                {result.hostelName}
              </span>
              <span className="rounded-xl bg-brand-500 text-white px-2.5 py-1 text-[11px] font-bold shadow-xs">
                Pref Rank #1
              </span>
            </div>
          </div>

          {/* Specifications Table */}
          <div className="p-6 space-y-4">
            <h3 className="font-heading text-lg font-bold text-foreground">
              Room Specifications & Amenities
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">Room Type</span>
                <span className="font-bold text-foreground mt-0.5 block">Double Sharing</span>
                <span className="text-[10px] text-muted">2 Residents / Room</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Air Conditioning
                </span>
                <span className="font-bold text-cyan-600 dark:text-cyan-400 mt-0.5 block flex items-center gap-1">
                  <Wind className="h-3.5 w-3.5" />
                  <span>Central AC</span>
                </span>
                <span className="text-[10px] text-muted">In-room thermostat</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Bed Position
                </span>
                <span className="font-bold text-foreground mt-0.5 block">Bed 1 (Window Side)</span>
                <span className="text-[10px] text-muted">South-Facing Natural Light</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Floor Level
                </span>
                <span className="font-bold text-foreground mt-0.5 block">
                  Floor 2 &bull; South Wing
                </span>
                <span className="text-[10px] text-muted">Lift #1 Accessible</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Furnishings
                </span>
                <span className="font-bold text-foreground mt-0.5 block">
                  Teak Bed &amp; Study Desk
                </span>
                <span className="text-[10px] text-muted">Lockable Wardrobe</span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-muted/50 border border-border/60">
                <span className="text-[10px] uppercase font-bold text-muted block">
                  Connectivity
                </span>
                <span className="font-bold text-foreground mt-0.5 block">Gigabit Ethernet</span>
                <span className="text-[10px] text-muted">Dual Cat6 RJ45 Ports</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border/60 bg-surface-muted/30 flex items-center justify-between text-xs">
            <span className="text-muted">Allocated on 24 Sep 2026, 02:30 PM</span>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadIcs}
              className="text-xs min-target-size"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
              <span>Add to Calendar</span>
            </Button>
          </div>
        </motion.div>

        {/* Right Column: Roommate Pair & Cryptographic Verification (5 cols) */}
        <div className="space-y-6 lg:col-span-5 flex flex-col justify-between">
          {/* Roommate Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: revealStep >= 2 ? 1 : 0, y: revealStep >= 2 ? 0 : 15 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600">
                  <Users className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Allocated Roommate
                  </h3>
                  <span className="text-[11px] text-muted">Mutual Consent Confirmed</span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                92% Match
              </span>
            </div>

            {((result.roommates as RoommateInfo[]) || []).map((rm, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-surface-muted/50 border border-border/60 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-white font-bold text-base shadow-xs">
                    {(rm.name || "Peer")
                      .split(" ")
                      .map((n: string) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <h4 className="font-heading text-sm font-bold text-foreground">{rm.name}</h4>
                    <p className="font-mono text-xs text-muted">Roll No: {rm.rollNo}</p>
                    <p className="text-[11px] text-muted">{rm.programme}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-border/50 text-muted">
                  <div>
                    <span>Sleep Habit:</span>{" "}
                    <strong className="text-foreground">Night Owl (1 AM)</strong>
                  </div>
                  <div>
                    <span>Study Habit:</span>{" "}
                    <strong className="text-foreground">Quiet Focus</strong>
                  </div>
                </div>
              </div>
            ))}

            <p className="text-[11px] text-muted leading-relaxed">
              Matched under zero-knowledge vector similarity. Individual lifestyle responses are
              kept confidential.
            </p>
          </motion.div>

          {/* Cryptographic Seal & Verification Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: revealStep >= 3 ? 1 : 0, y: revealStep >= 3 ? 0 : 15 }}
            transition={{ duration: 0.4 }}
            className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <h4 className="font-heading text-sm font-bold text-foreground">
                  Official Verification Seal
                </h4>
              </div>
              <span className="text-[10px] font-mono text-muted">PCG32 Verified</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-muted/60 border border-border/60 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-muted block">
                Verification Ledger ID
              </span>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-foreground truncate">
                  {result.verificationToken}
                </span>
                <button
                  type="button"
                  onClick={copyToken}
                  className="text-muted hover:text-foreground shrink-0 min-target-size"
                  aria-label="Copy verification token"
                >
                  {copiedToken ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsLetterModalOpen(true)}
                className="w-full text-xs min-target-size"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-muted" />
                <span>Preview Letter</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.success("Downloading official allocation letter PDF...");
                }}
                className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold min-target-size"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                <span>Download PDF</span>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 3. "Why This Room?" Side Drawer */}
      <Sheet open={isWhyDrawerOpen} onOpenChange={setIsWhyDrawerOpen}>
        <SheetContent side="right" className="w-[90vw] max-w-xl p-0 flex flex-col bg-surface">
          <SheetHeader className="p-6 border-b border-border/60 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 uppercase tracking-wider">
              <Sparkles className="h-4 w-4" />
              <span>Matching Engine Audit Trail</span>
            </div>
            <SheetTitle className="text-xl font-bold mt-1">Why this room?</SheetTitle>
            <SheetDescription className="text-xs">
              Deterministic, explainable allocation breakdown for Room {result.roomNo} (
              {result.hostelName})
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
            {/* Engine Summary */}
            <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-500/30">
              <span className="font-bold text-brand-700 dark:text-brand-300 block mb-1">
                Deterministic Allocation Verdict:
              </span>
              <p className="text-foreground leading-relaxed">{result.explanation.humanSummary}</p>
            </div>

            {/* Hard Constraints Invariants */}
            <div className="space-y-2">
              <h4 className="font-bold uppercase tracking-wider text-muted text-[11px]">
                Hard Constraints Verified (Zero Inversions)
              </h4>
              <div className="space-y-1.5">
                {(
                  (((result as Record<string, unknown>).explanation as Record<string, unknown>)
                    ?.hardConstraintsChecked as string[]) || []
                ).map((hc: string, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2.5 rounded-xl bg-surface-muted/50 border border-border/60"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="text-foreground">{hc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mathematical Scores */}
            <div className="space-y-3">
              <h4 className="font-bold uppercase tracking-wider text-muted text-[11px]">
                Score Components Vector
              </h4>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Hostel Preference Match (Rank #1)</span>
                  <span className="text-brand-600 font-bold">
                    {result.explanation.preferenceScore}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full"
                    style={{ width: `${result.explanation.preferenceScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Roommate Lifestyle Cosine Similarity</span>
                  <span className="text-emerald-600 font-bold">
                    {result.explanation.compatibilityScore}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${result.explanation.compatibilityScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Geographic Distance Priority (850 km)</span>
                  <span className="text-foreground font-bold">
                    {result.explanation.distanceScore}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full"
                    style={{ width: `${result.explanation.distanceScore}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between font-semibold mb-1">
                  <span>Room Capacity Fill Factor</span>
                  <span className="text-foreground font-bold">{result.explanation.fillScore}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${result.explanation.fillScore}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Tie-Break Details */}
            <div className="p-4 rounded-2xl bg-surface-muted/50 border border-border/60 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-muted block">
                Reproducible Tie-Break Guarantee
              </span>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {result.explanation.tieBreakInfo}
              </p>
              <span className="font-mono text-[10px] text-muted block pt-1">
                Checksum: {result.verificationToken}
              </span>
            </div>
          </div>

          <div className="p-4 border-t border-border/60 bg-surface-muted/40 flex justify-end">
            <Button
              size="sm"
              onClick={() => setIsWhyDrawerOpen(false)}
              className="text-xs min-target-size"
            >
              Close Breakdown
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* 4. Official Printable Allotment Letter Modal */}
      <Dialog open={isLetterModalOpen} onOpenChange={setIsLetterModalOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white text-zinc-900 border-zinc-200">
          <div className="p-6 sm:p-8 space-y-6">
            {/* Header */}
            <div className="border-b-2 border-zinc-900 pb-5 text-center">
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

            {/* Formal Details */}
            <div className="text-xs space-y-3.5 leading-relaxed text-zinc-800">
              <div className="flex justify-between items-start font-mono text-[11px]">
                <div>
                  <strong>Resident:</strong>{" "}
                  {student?.fullName ||
                    session?.user?.name ||
                    result.studentName ||
                    "Student Resident"}{" "}
                  ({student?.rollNumber || session?.user?.rollNumber || result.rollNo || "N/A"}
                  )
                  <br />
                  {student?.programme || "B.Tech Computer Science"} &bull; Year {student?.year || 1}
                </div>
                <div className="text-right">
                  <strong>Status:</strong> CONFIRMED ALLOTMENT
                  <br />
                  <strong>Quota:</strong> {student?.category || "General"} Tier
                </div>
              </div>

              <p>
                This document certifies that following the automated Gale-Shapley matching run, you
                have been allotted on-campus residential accommodation for the{" "}
                <strong>Autumn 2026–27</strong> academic session.
              </p>

              <div className="grid grid-cols-2 gap-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl font-mono text-xs">
                <div>
                  <span className="text-zinc-500 text-[10px] block">Residence:</span>
                  <strong className="text-zinc-900">{result.hostelName}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Room & Bed:</span>
                  <strong className="text-zinc-900">
                    Room {result.roomNo} &bull; {result.bedNo}
                  </strong>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] block">Block & Floor:</span>
                  <span className="text-zinc-900">
                    {result.blockName}, Floor {result.floorNo}
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
                <strong>October 1 and October 5, 2026</strong> for physical key handover.
              </p>
            </div>

            {/* Signature & Verification */}
            <div className="pt-4 border-t border-zinc-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">
                  Digital Verification Seal:
                </span>
                <span className="font-mono text-xs font-bold text-zinc-900 block">
                  {result.verificationToken}
                </span>
                <span className="text-[9px] text-zinc-500">
                  Cryptographically signed by Chief Warden Council
                </span>
              </div>
              <div className="text-right">
                <div className="font-heading font-bold text-zinc-900">Prof. R. K. Verma</div>
                <div className="text-[10px] text-zinc-500">Chief Warden of Student Residences</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs border-zinc-300 text-zinc-700 min-target-size"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                <span>Print Document</span>
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  toast.success("Official Letter PDF downloaded!");
                  setIsLetterModalOpen(false);
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

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
import { useAllocationResult } from "@/hooks/use-mock-api";
import {
  Sparkles,
  Download,
  HelpCircle,
  QrCode,
  CheckCircle2,
  Building,
  Printer,
  Users,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

export default function StudentAllocationResultPage() {
  const { data: result } = useAllocationResult();
  const [isWhyDrawerOpen, setIsWhyDrawerOpen] = React.useState(false);
  const [isLetterModalOpen, setIsLetterModalOpen] = React.useState(false);
  const [revealStep, setRevealStep] = React.useState(0);

  // Staged reveal animation sequence on page mount
  React.useEffect(() => {
    const t1 = setTimeout(() => setRevealStep(1), 250);
    const t2 = setTimeout(() => setRevealStep(2), 650);
    const t3 = setTimeout(() => setRevealStep(3), 1000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, []);

  const handleDownloadLetter = () => {
    toast.success("Downloading Official Allotment Letter (PDF with Signed QR Verification)...");
  };

  const handlePrint = () => {
    window.print();
  };

  if (!result) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Reveal Experience */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Official Allocation Confirmed</span>
            </div>
            <h1 className="font-heading text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {result.hostelName} &bull; Room {result.roomNo}
            </h1>
            <p className="text-xs sm:text-sm text-muted">
              {result.blockName} &bull; Floor {result.floorNo} &bull; Bed Position {result.bedNo}{" "}
              &bull; AC Attached
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              onClick={() => setIsLetterModalOpen(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-xs"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Allocation Letter
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsWhyDrawerOpen(true)}
              className="border-border/80 bg-surface"
            >
              <HelpCircle className="mr-1.5 h-4 w-4 text-brand-600" />
              Why this room?
            </Button>
          </div>
        </div>
      </div>

      {/* 2. Staged Reveal Bento: Image & Room Specifications */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Real Photography & Room Specs (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: revealStep >= 1 ? 1 : 0, y: revealStep >= 1 ? 0 : 12 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-border/70 bg-surface overflow-hidden shadow-xs"
          >
            {/* Real Campus Photography */}
            <div className="relative aspect-[16/9] w-full bg-surface-muted overflow-hidden">
              <SmartImage
                src="/images/campus-hero.jpg"
                alt="Aryabhata Hall Residence"
                fill
                priority
                className="object-cover"
              />
              <div className="absolute top-3 left-3">
                <span className="rounded-md bg-surface/90 backdrop-blur-md px-2.5 py-1 text-xs font-bold text-foreground border border-border/60 shadow-2xs">
                  {result.hostelName} &bull; {result.blockName}
                </span>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-heading text-base font-bold text-foreground">
                Room Specification
              </h3>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-xl bg-surface-muted/40 p-3 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted">Residence</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{result.hostelName}</p>
                </div>
                <div className="rounded-xl bg-surface-muted/40 p-3 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted">Assigned Bed</span>
                  <p className="font-bold text-foreground text-sm mt-0.5">{result.bedNo}</p>
                </div>
                <div className="rounded-xl bg-surface-muted/40 p-3 border border-border/60">
                  <span className="text-[10px] uppercase font-bold text-muted">Pref Rank</span>
                  <p className="font-bold text-brand-600 dark:text-brand-400 text-sm mt-0.5">
                    #{result.preferenceRank} Choice
                  </p>
                </div>
              </div>

              <div className="mt-5 border-t border-border/60 pt-4">
                <span className="text-xs font-semibold text-muted">
                  Allocation Governance Note:
                </span>
                <p className="mt-1 text-xs text-foreground/90 leading-relaxed bg-surface-muted/30 p-3 rounded-xl border border-border/50">
                  {result.explanation.humanSummary}
                </p>
              </div>
            </div>
          </motion.div>

          {/* Assigned Roommates Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: revealStep >= 2 ? 1 : 0, y: revealStep >= 2 ? 0 : 12 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-border/70 bg-surface p-6 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4.5 w-4.5 text-brand-600" />
                <h3 className="font-heading text-base font-bold text-foreground">
                  Assigned Roommate
                </h3>
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                {result.compatibilityScore}% Compatibility Match
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {result.roommates.map((rm, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-border/60 bg-surface-muted/30 p-3.5"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={rm.avatarUrl}
                      alt={rm.name}
                      className="h-10 w-10 rounded-full object-cover border border-border/60"
                    />
                    <div>
                      <h4 className="font-heading text-sm font-bold text-foreground">{rm.name}</h4>
                      <p className="text-xs text-muted">
                        {rm.rollNo} &bull; {rm.programme}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2.5 py-1 text-xs font-bold border border-emerald-200/60 dark:border-emerald-800/40">
                    {rm.compatibilityScore}% Match
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Column: QR Verification & Check-in Details (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: revealStep >= 3 ? 1 : 0, y: revealStep >= 3 ? 0 : 12 }}
            transition={{ duration: 0.3 }}
            className="rounded-2xl border border-border/70 bg-surface p-6 text-center shadow-xs"
          >
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-300">
              <QrCode className="h-5 w-5" />
            </div>
            <h3 className="mt-3 font-heading text-base font-bold text-foreground">
              Digital QR Verification
            </h3>
            <p className="mt-1 text-xs text-muted">
              Scan at the Warden Office check-in desk upon physical campus arrival.
            </p>

            {/* QR Mock Display */}
            <div className="mt-5 mx-auto flex h-40 w-40 flex-col items-center justify-center rounded-2xl border border-border/70 bg-surface p-4 shadow-xs">
              <QrCode className="h-24 w-24 text-foreground stroke-[1.25]" />
              <span className="font-mono text-[10px] text-muted truncate mt-1">
                {result.verificationToken}
              </span>
            </div>

            <div className="mt-5 space-y-2">
              <Button
                onClick={() => setIsLetterModalOpen(true)}
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                <ExternalLink className="mr-1.5 h-3.5 w-3.5 text-muted" />
                Preview Official Letter
              </Button>
              <Button
                onClick={handleDownloadLetter}
                size="sm"
                className="w-full bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download Signed PDF
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 3. "Why this room?" Explanation Side Drawer */}
      <Sheet open={isWhyDrawerOpen} onOpenChange={setIsWhyDrawerOpen}>
        <SheetContent side="right" className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl font-bold">
              Why did I receive this room?
            </SheetTitle>
            <SheetDescription className="text-xs text-muted">
              Gale-Shapley matching audit explanation and constraint verification
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 text-xs mt-6">
            {/* Hard Constraints */}
            <div>
              <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                Hard Constraints Verified
              </span>
              <ul className="mt-2 space-y-1.5">
                {result.explanation.hardConstraintsChecked.map((hc, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300"
                  >
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{hc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Score Breakdown */}
            <div className="border-t border-border/60 pt-4 space-y-3">
              <span className="font-bold text-foreground uppercase tracking-wider text-[10px]">
                Deterministic Score Breakdown
              </span>

              <div className="space-y-2.5">
                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span>Preference Rank Weight (45%)</span>
                    <strong className="text-foreground">
                      {result.explanation.preferenceScore} / 100
                    </strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-brand-500 rounded-full"
                      style={{ width: `${result.explanation.preferenceScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span>Roommate Compatibility (30%)</span>
                    <strong className="text-foreground">
                      {result.explanation.compatibilityScore} / 100
                    </strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${result.explanation.compatibilityScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span>Capacity Fill Optimization (15%)</span>
                    <strong className="text-foreground">
                      {result.explanation.fillScore} / 100
                    </strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-brand-400 rounded-full"
                      style={{ width: `${result.explanation.fillScore}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-medium mb-1">
                    <span>Academic Proximity Factor (10%)</span>
                    <strong className="text-foreground">
                      {result.explanation.distanceScore} / 100
                    </strong>
                  </div>
                  <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden">
                    <div
                      className="h-full bg-brand-300 rounded-full"
                      style={{ width: `${result.explanation.distanceScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Human Explanation Note */}
            <div className="rounded-xl bg-surface-muted/60 p-3.5 border border-border/60 text-muted leading-relaxed">
              <strong className="text-foreground block mb-1">Audit Ledger Note:</strong>
              {result.explanation.tieBreakInfo}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* 4. Digital Allocation Letter Preview Modal */}
      <Dialog open={isLetterModalOpen} onOpenChange={setIsLetterModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-8 bg-surface text-foreground space-y-6 print:p-0">
            {/* University Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-brand-500 pb-5">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500 text-white font-bold">
                  <Building className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="font-heading text-lg font-bold uppercase tracking-tight text-foreground">
                    National Institute of Technology
                  </h2>
                  <p className="text-xs text-muted">
                    Office of the Chief Warden &bull; Council of Wardens
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-muted">
                <p>
                  Issue Date: <strong>15 Sept 2026</strong>
                </p>
                <p>
                  Token:{" "}
                  <span className="font-mono text-foreground font-semibold">
                    {result.verificationToken}
                  </span>
                </p>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2">
              <h3 className="font-heading text-base font-bold uppercase tracking-wider text-foreground">
                Official Hostel Allocation &amp; Possession Letter
              </h3>
              <p className="text-xs text-muted mt-0.5">Academic Cycle 2026–2027</p>
            </div>

            {/* Student & Allotment Particulars */}
            <div className="grid grid-cols-2 gap-4 text-xs border border-border/80 rounded-xl p-4 bg-surface-muted/20">
              <div>
                <span className="text-muted">Applicant Name:</span>
                <p className="font-bold text-foreground">Aarav Sharma</p>
              </div>
              <div>
                <span className="text-muted">Roll Number:</span>
                <p className="font-bold text-foreground">23CS10042</p>
              </div>
              <div>
                <span className="text-muted">Hostel &amp; Block:</span>
                <p className="font-bold text-foreground">
                  {result.hostelName} ({result.blockName})
                </p>
              </div>
              <div>
                <span className="text-muted">Assigned Room &amp; Bed:</span>
                <p className="font-bold text-brand-600 dark:text-brand-400">
                  Room {result.roomNo}, Bed {result.bedNo}
                </p>
              </div>
              <div>
                <span className="text-muted">Floor &amp; Type:</span>
                <p className="font-bold text-foreground">
                  Floor {result.floorNo} (Air Conditioned Double)
                </p>
              </div>
              <div>
                <span className="text-muted">Allocation Mode:</span>
                <p className="font-bold text-foreground">
                  Deterministic Gale-Shapley (Pref Rank #1)
                </p>
              </div>
            </div>

            {/* Verification QR and Official Seal */}
            <div className="flex items-center justify-between pt-4 border-t border-border/60">
              <div className="flex items-center gap-3">
                <QrCode className="h-16 w-16 text-foreground stroke-[1.25]" />
                <div className="text-[11px] text-muted max-w-[240px]">
                  Cryptographically signed allocation token. Scan with university staff scanner to
                  verify authentic allotment.
                </div>
              </div>

              <div className="text-right text-xs text-muted">
                <div className="h-12 w-28 border border-dashed border-border rounded flex items-center justify-center text-[10px] text-muted italic ml-auto mb-1">
                  Digital Warden Seal
                </div>
                <p className="font-semibold text-foreground">Prof. S. R. Vardhan</p>
                <p className="text-[10px]">Chief Warden of Hostels</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint} className="text-xs">
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                Print Letter
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadLetter}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download PDF
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

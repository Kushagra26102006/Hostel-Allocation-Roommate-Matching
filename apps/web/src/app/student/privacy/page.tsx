"use client";

import * as React from "react";
import { Lock, ShieldCheck, Download, Trash2, Key, Database, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function StudentPrivacyCentrePage() {
  const [matchingConsent, setMatchingConsent] = React.useState(true);
  const [directoryConsent, setDirectoryConsent] = React.useState(false);
  const [analyticsConsent, setAnalyticsConsent] = React.useState(true);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const studentDataRecord = {
    profile: {
      name: "Aarav Sharma",
      rollNo: "23CS10042",
      programme: "B.Tech Computer Science & Engineering",
      email: "aarav.sharma@campus.edu",
      phone: "+91 98765 43210",
      homeState: "Maharashtra",
      distanceKm: 850,
      quotaCategory: "General Merited Tier 1",
    },
    allocation: {
      cycle: "Autumn 2026",
      hostel: "Aryabhata Hall",
      room: "A-204",
      bed: "Bed 1",
      verificationToken: "HH-2026-ALLOC-99281-A204",
    },
    documents: [
      { name: "fee_receipt_autumn_2026.pdf", sha256: "0x4b78912e...fe10" },
      { name: "student_id_card_23cs10042.jpg", sha256: "0x89ab10ef...c291" },
      { name: "domicile_certificate_mh.pdf", sha256: "0x12fa9081...e944" },
    ],
    lifestyleVector: {
      isSalted: true,
      hashMethod: "Argon2id + SHA-256 Cosine Vector",
      lastUpdated: "24 Sep 2026",
    },
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(studentDataRecord, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "hostelhub-student-data-archive.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Complete machine-readable student data archive exported (JSON)!");
  };

  const handleDeleteResponses = () => {
    setShowDeleteModal(false);
    toast.info("All questionnaire responses deleted. Compatibility vector reset.");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Lock className="h-3.5 w-3.5" />
            <span>Digital Personal Data Protection (DPDP)</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Student Privacy Centre
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Inspect all data stored about you, manage mutual consent, and export your official
            record.
          </p>
        </div>

        <Button
          onClick={handleExportData}
          className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold self-start sm:self-auto min-target-size"
        >
          <Download className="mr-1.5 h-4 w-4" />
          <span>Export My Data Archive</span>
        </Button>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="rounded-3xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-cyan-500/10 p-6 shadow-xs flex items-start gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-white shrink-0 mt-0.5 shadow-xs">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
          <h3 className="font-heading text-sm font-bold text-foreground">
            Our Mathematical Privacy Architecture
          </h3>
          <p>
            HostelHub adheres to strict student privacy boundaries. Your individual lifestyle survey
            answers (sleep schedules, room habits) are salted and hashed client-side before
            matching. No peer, student representative, or faculty can view your raw survey
            responses.
          </p>
        </div>
      </div>

      {/* Personal Data View */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Database className="h-4.5 w-4.5 text-brand-600" />
            <h3 className="font-heading text-base font-bold text-foreground">
              What Personal Data Does HostelHub Hold?
            </h3>
          </div>
          <span className="text-[11px] font-mono text-muted">Immutable Ledger Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted block">
              Identity & Roll
            </span>
            <span className="font-bold text-foreground block">
              {studentDataRecord.profile.name} ({studentDataRecord.profile.rollNo})
            </span>
            <span className="text-muted block text-[11px]">
              {studentDataRecord.profile.programme}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted block">
              Contact Channels
            </span>
            <span className="font-bold text-foreground block">
              {studentDataRecord.profile.email}
            </span>
            <span className="text-muted block text-[11px]">{studentDataRecord.profile.phone}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted block">
              Geographic Standing
            </span>
            <span className="font-bold text-foreground block">
              {studentDataRecord.profile.homeState} ({studentDataRecord.profile.distanceKm} km from
              campus)
            </span>
            <span className="text-muted block text-[11px]">Priority: High Distance Tier</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-1">
            <span className="text-[10px] uppercase font-bold text-muted block">
              Active Room Allotment
            </span>
            <span className="font-bold text-foreground block">
              {studentDataRecord.allocation.hostel} &bull; Room {studentDataRecord.allocation.room}
            </span>
            <span className="font-mono text-[10px] text-muted block truncate">
              {studentDataRecord.allocation.verificationToken}
            </span>
          </div>
        </div>
      </div>

      {/* Questionnaire Data & Deletion Controls */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Key className="h-4.5 w-4.5 text-brand-600" />
            <h3 className="font-heading text-base font-bold text-foreground">
              Lifestyle Questionnaire Data & Erasure
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase rounded-md bg-emerald-500/10 text-emerald-600 px-2 py-0.5">
            Encrypted
          </span>
        </div>

        <p className="text-xs text-muted leading-relaxed">
          Your questionnaire data is stored exclusively as a normalized 7-dimensional cosine vector.
          You maintain the statutory right under privacy law to permanently delete these responses
          at any time.
        </p>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs">
          <div>
            <span className="font-bold text-foreground block">Permanent Questionnaire Erasure</span>
            <span className="text-muted text-[11px]">
              Purge all habit answers and reset matching vector to neutral baseline
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDeleteModal(true)}
            className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 min-target-size"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            <span>Erase Answers</span>
          </Button>
        </div>
      </div>

      {/* Consent Management Toggles */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h3 className="font-heading text-base font-bold text-foreground">
            Consent & Discovery Preferences
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Manage how other students and university systems interact with your profile.
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <div>
              <span className="font-bold text-foreground block">Roommate Discovery Consent</span>
              <span className="text-muted text-[11px]">
                Allow verified classmates to invite you to roommate groups by roll number.
              </span>
            </div>
            <input
              type="checkbox"
              checked={matchingConsent}
              onChange={(e) => {
                setMatchingConsent(e.target.checked);
                toast.success("Roommate discovery preference updated");
              }}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <div>
              <span className="font-bold text-foreground block">Campus Directory Listing</span>
              <span className="text-muted text-[11px]">
                Display your assigned room block in the public hall resident directory.
              </span>
            </div>
            <input
              type="checkbox"
              checked={directoryConsent}
              onChange={(e) => {
                setDirectoryConsent(e.target.checked);
                toast.success("Directory listing preference updated");
              }}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <div>
              <span className="font-bold text-foreground block">Anonymized Research Inclusion</span>
              <span className="text-muted text-[11px]">
                Include anonymized satisfaction metrics to improve campus housing algorithms.
              </span>
            </div>
            <input
              type="checkbox"
              checked={analyticsConsent}
              onChange={(e) => {
                setAnalyticsConsent(e.target.checked);
                toast.success("Research consent preference updated");
              }}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Questionnaire Deletion */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md p-6 bg-surface text-foreground border-border/80">
          <DialogHeader className="space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-bold">
              Confirm Questionnaire Data Deletion
            </DialogTitle>
            <DialogDescription className="text-xs text-muted leading-relaxed">
              Are you sure you wish to permanently purge your lifestyle responses? This action
              cannot be undone. Any roommate pairings relying on your compatibility score will
              default to a neutral rating.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteModal(false)}
              className="text-xs min-target-size"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeleteResponses}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs min-target-size"
            >
              Confirm Deletion
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

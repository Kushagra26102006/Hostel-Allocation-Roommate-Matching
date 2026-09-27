"use client";

import * as React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  XCircle,
  ArrowRight,
  Upload,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface EligibilityRule {
  id: string;
  name: string;
  status: "passed" | "pending" | "failed";
  policyRef: string;
  reason: string;
  correctiveAction?: string;
  actionHref?: string;
  actionLabel?: string;
  verifiedAt: string;
  verifiedBy: string;
}

export default function StudentEligibilityPage() {
  const rules: EligibilityRule[] = [
    {
      id: "rule-dist",
      name: "Geographic Distance Criterion (> 50 km)",
      status: "passed",
      policyRef: "Hostel Policy Clause 2.1",
      reason:
        "Your verified permanent address in Mumbai is 850 km from campus, exceeding the 50 km threshold. You qualify for high-priority outstation allocation.",
      verifiedAt: "24 Sep 2026, 11:20 AM",
      verifiedBy: "Automated GIS Distance Engine",
    },
    {
      id: "rule-academic",
      name: "Academic Standing & Full-Time Enrolment",
      status: "passed",
      policyRef: "Bylaw 3.4 (Merit & Progression)",
      reason:
        "Active enrolment in Year 3 B.Tech Computer Science with CGPA of 9.35 satisfies the minimum requirement of 6.00 with zero active course backlogs.",
      verifiedAt: "24 Sep 2026, 11:25 AM",
      verifiedBy: "Dean of Academic Affairs Registry",
    },
    {
      id: "rule-fees",
      name: "Tuition & Hostel Fee Clearance",
      status: "passed",
      policyRef: "Financial Services Clause 1.2",
      reason:
        "Your semester tuition and room advance dues have been settled in full. Fee receipt #AUT-2026-881 is verified.",
      correctiveAction: "If dues remain unpaid in future cycles, upload latest fee receipt here.",
      actionHref: "/student/documents",
      actionLabel: "View Verified Receipt",
      verifiedAt: "24 Sep 2026, 02:40 PM",
      verifiedBy: "Accounts & Financial Affairs",
    },
    {
      id: "rule-discipline",
      name: "Disciplinary Record Clearance",
      status: "passed",
      policyRef: "Student Conduct Code Clause 6",
      reason:
        "You have zero pending disciplinary infractions, proctorial inquiries, or past hostel debarment orders.",
      verifiedAt: "24 Sep 2026, 03:00 PM",
      verifiedBy: "Proctorial Board & Warden Council",
    },
    {
      id: "rule-documents",
      name: "Mandatory Identity & Residence Proofs",
      status: "passed",
      policyRef: "Verification Standards Clause 4",
      reason:
        "All required documents (Institute ID card, domicile certificate, and fee receipt) are digitally verified.",
      actionHref: "/student/documents",
      actionLabel: "Document Centre",
      verifiedAt: "24 Sep 2026, 04:15 PM",
      verifiedBy: "Hostel Administrative Office",
    },
    {
      id: "rule-quota",
      name: "Category & Quota Verification",
      status: "passed",
      policyRef: "Statutory Reservation Directive",
      reason:
        "Enrolled under General Merited Tier 1. Academic records confirmed by admissions cell.",
      verifiedAt: "24 Sep 2026, 04:30 PM",
      verifiedBy: "Admissions Verification Committee",
    },
  ];

  const passedCount = rules.filter((r) => r.status === "passed").length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Policy Compliance & Rule Engine</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Allocation Eligibility Status
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Transparent policy audit evaluating your right to university residence allocation.
          </p>
        </div>

        <Button
          asChild
          variant="outline"
          size="sm"
          className="text-xs border-border/80 self-start sm:self-auto min-target-size"
        >
          <Link href="/student/documents">
            <Upload className="mr-1.5 h-3.5 w-3.5 text-brand-600" />
            <span>Manage Documents</span>
          </Link>
        </Button>
      </div>

      {/* Hero Overview Card */}
      <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white shrink-0 shadow-md">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">
                <span>Verification Completed</span>
                <span>&bull;</span>
                <span>All {rules.length} Criteria Passed</span>
              </div>
              <h2 className="font-heading text-xl sm:text-2xl font-extrabold text-foreground mt-0.5">
                Eligible for Autumn 2026 Room Allocation
              </h2>
              <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed max-w-2xl">
                Your profile satisfies all academic standing, geographic distance, financial
                clearance, and conduct guidelines. Your application is officially active in the
                Gale-Shapley matching run.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-500/20 bg-surface/80 p-4 shrink-0 text-center sm:text-right">
            <div className="text-[10px] uppercase font-bold text-muted">Rules Verified</div>
            <div className="font-heading text-2xl font-extrabold text-emerald-600">
              {passedCount} / {rules.length}
            </div>
            <div className="text-[11px] text-muted">100% Policy Pass Rate</div>
          </div>
        </div>
      </div>

      {/* Rule-by-rule Breakdown List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-heading text-base font-bold text-foreground">
            Policy Criteria Evaluation
          </h3>
          <span className="text-xs text-muted">
            Never cryptic &bull; Plain English explanations
          </span>
        </div>

        <div className="space-y-3">
          {rules.map((rule) => {
            const isPassed = rule.status === "passed";
            const isPending = rule.status === "pending";

            return (
              <div
                key={rule.id}
                className="rounded-2xl border border-border/80 bg-surface p-5 sm:p-6 shadow-xs hover:border-brand-500/40 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                        isPassed
                          ? "bg-emerald-500/10 text-emerald-600"
                          : isPending
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-rose-500/10 text-rose-600"
                      }`}
                    >
                      {isPassed ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : isPending ? (
                        <AlertCircle className="h-5 w-5" />
                      ) : (
                        <XCircle className="h-5 w-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-heading text-sm sm:text-base font-bold text-foreground">
                          {rule.name}
                        </h4>
                        <span className="rounded-md bg-surface-muted px-2 py-0.5 text-[10px] font-mono text-muted border border-border/60">
                          {rule.policyRef}
                        </span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed max-w-3xl">{rule.reason}</p>

                      {rule.correctiveAction && !isPassed && (
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 mt-2">
                          <strong>Action required:</strong> {rule.correctiveAction}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        isPassed
                          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : isPending
                            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      {isPassed
                        ? "Rule Passed"
                        : isPending
                          ? "Verification Pending"
                          : "Action Needed"}
                    </span>

                    {rule.actionHref && (
                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="text-xs text-brand-600 font-bold min-target-size"
                      >
                        <Link href={rule.actionHref}>
                          <span>{rule.actionLabel}</span>
                          <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between text-[11px] text-muted gap-2">
                  <span>Verified: {rule.verifiedAt}</span>
                  <span>Authority: {rule.verifiedBy}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Explanatory FAQ / Help Card */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
          <div className="text-xs text-muted">
            <span className="font-bold text-foreground block">
              Have questions regarding an eligibility rule or need an exemption?
            </span>
            <span>
              Students with exceptional medical hardship or special accommodations may submit an
              appeal or contact the Warden Council desk.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button asChild size="sm" variant="outline" className="text-xs min-target-size">
            <Link href="/student/appeals">
              <span>Lodge Appeal</span>
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs min-target-size"
          >
            <Link href="/student/help">
              <span>Help Centre</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

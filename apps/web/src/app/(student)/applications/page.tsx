"use client";

import React, { useState } from "react";
import { FileText, CheckCircle2, Download } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { StatusChip } from "@/components/status-chip";
import { PreferenceRanker, type HostelCardData } from "@/components/preferences/preference-ranker";
import { GroupBuilder } from "@/components/preferences/group-builder";
import { ApplicationForm } from "@/components/application/application-form";
import { useCurrentStudent } from "@/hooks/use-current-student";
import { useSession } from "next-auth/react";

const INITIAL_HOSTELS: HostelCardData[] = [
  {
    id: "h-ary",
    name: "Aryabhata Hall (Block A)",
    roomType: "Double AC",
    ac: true,
    walkingTimeMin: 6,
    availabilityHint: "High Demand (94% Fill Rate)",
    photoUrl: "/images/hostels/aryabhata.jpg",
  },
  {
    id: "h-ram",
    name: "Ramanujan Tower (Block C)",
    roomType: "Single Studio & Double AC",
    ac: true,
    walkingTimeMin: 8,
    availabilityHint: "Moderate Demand (90% Fill Rate)",
    photoUrl: "/images/hostels/ramanujan.jpg",
  },
  {
    id: "h-bha",
    name: "Bhabha Hall (Block E)",
    roomType: "Double & Triple Sharing",
    ac: false,
    walkingTimeMin: 10,
    availabilityHint: "Open Availability",
    photoUrl: "/images/hostels/bhabha.jpg",
  },
  {
    id: "h-vis",
    name: "Visvesvaraya International Tower",
    roomType: "Scholar Suite",
    ac: true,
    walkingTimeMin: 12,
    availabilityHint: "Limited Research Quota",
    photoUrl: "/images/hostels/visvesvaraya.jpg",
  },
];

export default function StudentApplicationsPage() {
  const { data: session } = useSession();
  const { data: student } = useCurrentStudent();

  const [activeTab, setActiveTab] = useState<"overview" | "preferences" | "group" | "edit">(
    "overview",
  );

  const application = {
    referenceNumber: student?.applicationReference || "NIT-APP-2026-0001",
    cycle: "Autumn 2026 Hostel Allocation Cycle",
    cycleId: "cycle-autumn-2026",
    status: student?.applicationStatus || "approved",
    submittedAt: "September 11, 2026 • 14:32 IST",
    priorityTier: "Tier 2 — Academic Merit (CGPA 8.92)",
    allocatedRoom: student?.hasAllocation
      ? "Room 304, Tower A, Aryabhata Hall"
      : "Pending Allotment",
    allocatedBed: student?.hasAllocation ? "Bed A-304-1 (Window)" : "Pending Allotment",
    student: {
      fullName: student?.fullName || session?.user?.name || "Student Resident",
      rollNo: student?.rollNumber || session?.user?.rollNumber || "Pending Enrollment",
      programme: student?.programme || "BTech",
      department: student?.department || "Computer Science & Engineering",
      semester: student?.year ? student.year * 2 - 1 : 1,
      quotaBucket: student?.category || "General",
      email: student?.email || session?.user?.email || "student@campus.edu",
      phone: student?.phone || "+91 98765 43210",
      homeState: student?.homeState || "Registered State",
    },
    documents: [
      { name: "Institute Student Identity Card", type: "ID Proof", status: "Verified" },
      { name: "Semester 5 Tuition Fee Challan", type: "Fee Receipt", status: "Verified" },
      { name: "Government Photo Aadhaar Card", type: "Address Proof", status: "Verified" },
    ],
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
            <FileText className="h-3.5 w-3.5" />
            <span>Application Portal</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Hostel Application #{application.referenceNumber}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {application.cycle} • Submitted on {application.submittedAt}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl border border-border/80 bg-muted/20 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "overview"
                ? "bg-card text-text shadow-xs"
                : "text-muted hover:text-text"
            }`}
          >
            Application Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("preferences")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "preferences"
                ? "bg-card text-text shadow-xs"
                : "text-muted hover:text-text"
            }`}
          >
            Tower Preferences
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("group")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "group" ? "bg-card text-text shadow-xs" : "text-muted hover:text-text"
            }`}
          >
            Group Booking
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "edit" ? "bg-card text-text shadow-xs" : "text-muted hover:text-text"
            }`}
          >
            Form Wizard
          </button>
        </div>
      </div>

      {/* 2. TAB: Overview */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Status Banner */}
          <GlassCard className="p-6 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-bold text-lg shadow-sm">
                  ✓
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-text">Allotment Confirmed & Approved</h2>
                    <StatusChip status="success" label="Allocated" />
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Assigned to <strong className="text-text">{application.allocatedRoom}</strong> (
                    {application.allocatedBed})
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl bg-card border border-border px-4 py-2 text-xs font-bold text-text hover:bg-muted/10 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Signed Slip</span>
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Details Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Applicant Profile (2 cols) */}
            <div className="lg:col-span-2 space-y-6">
              <GlassCard className="p-6">
                <h3 className="font-heading text-lg font-bold text-text mb-4">
                  Applicant Particulars
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border/50 bg-muted/5 p-3.5">
                    <span className="text-xs text-muted">Full Name</span>
                    <p className="text-sm font-bold text-text mt-0.5">
                      {application.student.fullName}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/5 p-3.5">
                    <span className="text-xs text-muted">Roll Number</span>
                    <p className="text-sm font-bold text-text mt-0.5">
                      {application.student.rollNo}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/5 p-3.5">
                    <span className="text-xs text-muted">Academic Department</span>
                    <p className="text-sm font-bold text-text mt-0.5">
                      {application.student.department}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/5 p-3.5">
                    <span className="text-xs text-muted">Current Semester</span>
                    <p className="text-sm font-bold text-text mt-0.5">
                      Semester {application.student.semester} ({application.student.programme})
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/5 p-3.5">
                    <span className="text-xs text-muted">Priority Tier</span>
                    <p className="text-sm font-bold text-brand-600 dark:text-brand-400 mt-0.5">
                      {application.priorityTier}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/5 p-3.5">
                    <span className="text-xs text-muted">Home State / Domicile</span>
                    <p className="text-sm font-bold text-text mt-0.5">
                      {application.student.homeState}
                    </p>
                  </div>
                </div>
              </GlassCard>

              {/* Uploaded Documents */}
              <GlassCard className="p-6">
                <h3 className="font-heading text-lg font-bold text-text mb-4">
                  Verification Documents
                </h3>
                <div className="space-y-3">
                  {application.documents.map((doc) => (
                    <div
                      key={doc.name}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-card p-3.5"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-brand-500" />
                        <div>
                          <span className="text-xs font-bold text-text">{doc.name}</span>
                          <p className="text-[10px] text-muted">{doc.type}</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" /> {doc.status}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>

            {/* Application Timeline (1 col) */}
            <div>
              <GlassCard className="p-6">
                <h3 className="font-heading text-lg font-bold text-text mb-4">
                  Processing History
                </h3>
                <div className="relative border-l border-border/60 pl-4 space-y-6">
                  <div>
                    <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Complete
                    </span>
                    <h4 className="text-xs font-bold text-text mt-0.5">Room Allotment Confirmed</h4>
                    <p className="text-[11px] text-muted">
                      Room 304, Bed A-304-1 allocated by deterministic engine run #42.
                    </p>
                    <span className="text-[10px] text-muted mt-1 block">
                      Sep 18, 2026 • 16:00 IST
                    </span>
                  </div>

                  <div>
                    <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Complete
                    </span>
                    <h4 className="text-xs font-bold text-text mt-0.5">Roommate Paired</h4>
                    <p className="text-[11px] text-muted">
                      Matched with Kabir Mehta (94% compatibility).
                    </p>
                    <span className="text-[10px] text-muted mt-1 block">
                      Sep 16, 2026 • 11:15 IST
                    </span>
                  </div>

                  <div>
                    <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Complete
                    </span>
                    <h4 className="text-xs font-bold text-text mt-0.5">Documents Verified</h4>
                    <p className="text-[11px] text-muted">
                      All 3 credentials approved by Warden Verification Desk.
                    </p>
                    <span className="text-[10px] text-muted mt-1 block">
                      Sep 13, 2026 • 09:45 IST
                    </span>
                  </div>

                  <div>
                    <div className="absolute -left-1.5 h-3 w-3 rounded-full bg-emerald-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                      Complete
                    </span>
                    <h4 className="text-xs font-bold text-text mt-0.5">Application Submitted</h4>
                    <p className="text-[11px] text-muted">
                      Application fee paid and ref #NIT-APP-2026-0001 generated.
                    </p>
                    <span className="text-[10px] text-muted mt-1 block">
                      Sep 11, 2026 • 14:32 IST
                    </span>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB: Tower Preferences */}
      {activeTab === "preferences" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-text">
                Hostel Tower Preference Ranking
              </h2>
              <p className="text-xs text-muted">
                Drag or use arrow buttons to prioritize your preferred residential towers.
              </p>
            </div>
          </div>

          <PreferenceRanker
            applicationId={application.referenceNumber}
            initialHostels={INITIAL_HOSTELS}
          />
        </div>
      )}

      {/* 4. TAB: Group Room Booking */}
      {activeTab === "group" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-text">
                Group / Roommate Squad Builder
              </h2>
              <p className="text-xs text-muted">
                Form a group with friends to be allocated in the same room.
              </p>
            </div>
          </div>

          <GroupBuilder cycleId={application.cycleId} currentUserId="student.demo@nit.edu" />
        </div>
      )}

      {/* 5. TAB: Full Application Form Wizard */}
      {activeTab === "edit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold text-text">
                Application Form Multi-Step Wizard
              </h2>
              <p className="text-xs text-muted">
                Step through profile, documents, preferences, and review.
              </p>
            </div>
          </div>

          <ApplicationForm
            cycleId={application.cycleId}
            initialApplication={{
              id: "app-1",
              reference_number: application.referenceNumber,
              status: "approved",
              version: 1,
              form_data: {
                profile: {
                  fullName: application.student.fullName,
                  email: application.student.email,
                  phone: "9876543210",
                  pincode: "110001",
                  city: "New Delhi",
                  state: "Delhi NCR",
                  address: "Sector 14, Academic Avenue",
                },
                preferences: {
                  roomType: "double",
                  acPreference: "ac",
                  floorPreference: "mid",
                },
                questionnaire: {
                  priorityTier: "merit",
                  dietaryPreference: "veg",
                  studyHabits: "night_owl",
                },
              },
            }}
          />
        </div>
      )}
    </div>
  );
}

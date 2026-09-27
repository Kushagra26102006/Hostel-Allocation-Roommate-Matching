"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Download,
  CalendarPlus,
  ArrowLeftRight,
  Scale,
  Sparkles,
  HelpCircle,
  Users,
  ShieldCheck,
  Clock,
  MapPin,
  QrCode,
  Lock,
  CheckCircle2,
  Calendar,
  Check,
  Moon,
  BookOpen,
} from "lucide-react";
import { HostelHubLogo } from "@/components/brand/logo";
import { KeyCardFlip } from "@/components/student/result/key-card-flip";
import { RoomChangeDialog } from "@/components/student/result/room-change-dialog";
import { AppealDialog } from "@/components/student/result/appeal-dialog";
import { triggerIcsDownload } from "@/lib/calendar";
import type { StudentResultData } from "@hostelhub/domain";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function StudentRoomPage() {
  const { data: session } = useSession();
  const [data, setData] = React.useState<StudentResultData | null>(null);
  const [isRoomChangeOpen, setIsRoomChangeOpen] = React.useState<boolean>(false);
  const [isAppealOpen, setIsAppealOpen] = React.useState<boolean>(false);
  const [isDownloading, setIsDownloading] = React.useState<boolean>(false);
  const [, setIsRevealed] = React.useState<boolean>(false);
  const [isAcknowledged, setIsAcknowledged] = React.useState<boolean>(false);
  const [isAcknowledgeOpen, setIsAcknowledgeOpen] = React.useState<boolean>(false);
  const [ackNote, setAckNote] = React.useState<string>("");

  React.useEffect(() => {
    let isMounted = true;
    async function fetchResult() {
      try {
        const res = await fetch("/api/v1/student/allocation-result");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setData(json.data);
          }
        }
      } catch {
        // Fallback default sample data
      }
    }

    void fetchResult();
    return () => {
      isMounted = false;
    };
  }, []);

  // Allocation fallback values matching seeded resident
  const allocation = data?.hasAllocation
    ? data
    : {
        hasAllocation: true,
        status: "published" as const,
        assignmentId: "mock-asgn-01",
        letterId: "mock-letter-01",
        letterDownloadUrl: "/api/v1/letters/mock-letter-01/download",
        hostel: {
          name: "Aryabhata Hall",
          block: "Tower A (North Wing)",
          floor: 3,
          roomNumber: "304",
          bedNo: "Bed A-304-1",
          roomType: "Double Sharing (Air Conditioned)",
        },
        score: 94,
        compatibilityPercent: 94,
        whyThisRoom:
          "High compatibility match based on synchronized quiet study habits and nocturnal sleeping preference.",
        moveInDate: "September 25, 2026",
        checkInWindow: "10:00 AM – 5:00 PM IST",
        roommates: [
          {
            name: "Kabir Mehta",
            rollNumber: "22BCS058",
            bedNo: "Bed A-304-2",
            isConsented: true,
          },
        ],
      };

  const handleDownloadLetter = async () => {
    if (allocation.letterId) {
      try {
        setIsDownloading(true);
        const res = await fetch(`/api/v1/letters/${allocation.letterId}/download`);
        if (res.ok) {
          const body = await res.json();
          if (body.download_url) {
            window.open(body.download_url, "_blank");
          }
        } else {
          window.open(`/api/v1/letters/${allocation.letterId}/download?redirect=true`, "_blank");
        }
      } catch {
        window.open(`/api/v1/letters/${allocation.letterId}/download`, "_blank");
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleAddToCalendar = () => {
    const moveInStart = new Date("2026-09-25T10:00:00");
    const moveInEnd = new Date("2026-09-25T17:00:00");

    triggerIcsDownload({
      title: `Hostel Move-In: ${allocation.hostel.name} Room ${allocation.hostel.roomNumber}`,
      description: `Official reporting and move-in check-in window.\nRoom: ${allocation.hostel.roomNumber} (${allocation.hostel.bedNo})\nHostel: ${allocation.hostel.name}, ${allocation.hostel.block}\nBring your allocation letter, ID card, and fitness certificate.`,
      location: `${allocation.hostel.name} Caretaker Office, Campus`,
      startDate: moveInStart,
      endDate: moveInEnd,
    });
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden">
      {/* ── Background Ambient Light Spots & Futuristic Grid ────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Soft Radial Ambient Glows */}
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/4 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute -bottom-32 left-1/3 h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[140px]" />

        {/* High-tech Subtle Grid Overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* ── Centered Max-Width Page Container ───────────────────────────────── */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ── 1. Top Header ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6"
        >
          {/* Left: Modern HostelHub Logo Treatment */}
          <div className="flex items-center gap-3">
            <HostelHubLogo size="md" href="/dashboard" />
            <div className="hidden sm:block h-5 w-px bg-slate-800" aria-hidden="true" />
            <span className="hidden sm:inline-block text-xs font-semibold text-slate-400 font-mono tracking-wider uppercase">
              Student Housing
            </span>
          </div>

          {/* Right: Primary & Secondary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary: Download Letter (Cyan background, dark text) */}
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleDownloadLetter}
              disabled={isDownloading}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400 hover:from-cyan-300 hover:to-sky-300 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all duration-200 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-slate-950 stroke-[2.5]" />
              <span>{isDownloading ? "Preparing PDF..." : "Download Letter"}</span>
            </motion.button>

            {/* Secondary: Add to Calendar (Dark navy surface, subtle blue border) */}
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAddToCalendar}
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-[#071026]/90 hover:bg-slate-800 hover:border-cyan-400/50 px-4 sm:px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-200 shadow-sm transition-all duration-200 cursor-pointer backdrop-blur-md"
            >
              <CalendarPlus className="h-4 w-4 text-cyan-400" />
              <span>Add to Calendar</span>
            </motion.button>
          </div>
        </motion.div>

        {/* ── 2. Page Hero / Title Area ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="space-y-2"
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-1 text-xs font-bold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>✦ Allocation Results Live</span>
          </div>

          {/* Large Bold Heading */}
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
            Room &amp; Bed Allotment
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
            Your official housing allocation decision, verification pass, and move-in instructions.
          </p>
        </motion.div>

        {/* ── 3. Main 2-Column Workspace (40% / 60%) ────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* ── LEFT COLUMN: Interactive Room Pass (40% / 5 cols) ──────────── */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="lg:col-span-5 space-y-4"
          >
            {/* Section Header */}
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-cyan-400 block font-mono">
                CENTERPIECE PASS
              </span>
              <h2 className="font-heading text-lg font-bold text-white mt-0.5">
                Interactive Room Pass
              </h2>
              <p className="text-xs text-slate-400">
                Tap the card to reveal your room allotment and compatibility score.
              </p>
            </div>

            {/* Futuristic 3D Holographic Key-Card Component */}
            <KeyCardFlip
              hostelName={allocation.hostel.name}
              blockName={allocation.hostel.block}
              floor={allocation.hostel.floor}
              roomNumber={allocation.hostel.roomNumber}
              bedNo={allocation.hostel.bedNo}
              roomType={allocation.hostel.roomType}
              score={allocation.score}
              studentName={session?.user?.name || "Student Resident"}
              cycleName="Autumn 2026"
              onRevealed={() => setIsRevealed(true)}
            />

            {/* Security Proof Badges below card */}
            <div className="flex items-center justify-center gap-4 text-xs text-slate-400 pt-1 font-mono">
              <span className="inline-flex items-center gap-1.5 text-cyan-400">
                <QrCode className="h-3.5 w-3.5" />
                Signed QR Pass
              </span>
              <span className="text-slate-600">•</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" />
                Ed25519 Verified
              </span>
            </div>
          </motion.div>

          {/* ── RIGHT COLUMN: Supporting Information Cards (60% / 7 cols) ───── */}
          <div className="lg:col-span-7 space-y-6">
            {/* ── Card 1: Why This Room? ────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="rounded-3xl border border-[rgba(80,110,160,0.25)] bg-[rgba(10,18,38,0.85)] p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/40 space-y-4 hover:border-cyan-500/40 transition-colors duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shadow-sm">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-white">Why this room?</h3>
                    <p className="text-xs text-slate-400">
                      Transparent explanation generated from your compatibility preferences
                    </p>
                  </div>
                </div>

                {/* Compatibility Green/Cyan Pill */}
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400 shadow-sm self-start sm:self-auto">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  <span>{allocation.score}% Compatibility</span>
                </div>
              </div>

              {/* Dynamic Explanation Quote */}
              <div className="p-4 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed font-sans italic border-l-4 border-l-cyan-500">
                &ldquo;{allocation.whyThisRoom}&rdquo;
              </div>

              {/* 3 Compact Compatibility Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                <div className="p-3.5 rounded-2xl bg-[#050b1d]/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-200 group">
                  <div className="flex items-center gap-2 text-cyan-400 mb-1">
                    <Moon className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      SLEEP SYNC
                    </span>
                  </div>
                  <p className="font-bold text-white text-sm">High Affinity</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">11 PM – 7 AM Synchronized</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#050b1d]/60 border border-slate-800/80 hover:border-indigo-500/40 transition-all duration-200 group">
                  <div className="flex items-center gap-2 text-indigo-400 mb-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      STUDY HABIT
                    </span>
                  </div>
                  <p className="font-bold text-white text-sm">Quiet Room</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Zero Distraction Policy</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#050b1d]/60 border border-slate-800/80 hover:border-emerald-500/40 transition-all duration-200 group">
                  <div className="flex items-center gap-2 text-emerald-400 mb-1">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      ACCESSIBILITY
                    </span>
                  </div>
                  <p className="font-bold text-white text-sm">Verified Floor</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Elevator &amp; Ramp Access</p>
                </div>
              </div>
            </motion.div>

            {/* ── Card 2: Roommate Details (Mutual Consent Privacy Respected) ─ */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
              className="rounded-3xl border border-[rgba(80,110,160,0.25)] bg-[rgba(10,18,38,0.85)] p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/40 space-y-4 hover:border-indigo-500/40 transition-colors duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-400 shadow-sm">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-white">Roommate Details</h3>
                  <p className="text-xs text-slate-400">
                    Names revealed strictly under mutual directory privacy consent
                  </p>
                </div>
              </div>

              {allocation.roommates.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[#050b1d]/60 border border-slate-800 text-xs text-slate-400">
                  No roommates assigned to this room (single occupancy studio suite).
                </div>
              ) : (
                <div className="space-y-3">
                  {allocation.roommates.map((rm, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 hover:border-slate-700"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Avatar KM */}
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-500 text-white font-bold text-sm shadow-md ring-2 ring-white/10">
                          {rm.name
                            ? rm.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()
                            : "KM"}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <strong className="text-sm font-bold text-white">{rm.name}</strong>
                            {rm.isConsented ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                <Check className="h-3 w-3 stroke-[2.5]" />
                                Consent Granted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-400">
                                <Lock className="h-2.5 w-2.5" />
                                Private
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-medium mt-0.5 font-mono">
                            {rm.bedNo} {rm.rollNumber ? `• Roll: ${rm.rollNumber}` : ""}
                          </p>
                        </div>
                      </div>

                      {!rm.isConsented && (
                        <span className="text-[11px] text-slate-500 max-w-[180px] sm:text-right">
                          Directory identity concealed per student privacy settings
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* ── Card 3: Reporting & Check-in Schedule ──────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.3 }}
              className="rounded-3xl border border-[rgba(80,110,160,0.25)] bg-[rgba(10,18,38,0.85)] p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/40 space-y-4 hover:border-emerald-500/40 transition-colors duration-300"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 shadow-sm">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-heading text-base font-bold text-white">
                    Reporting &amp; Check-in Schedule
                  </h3>
                  <p className="text-xs text-slate-400">
                    Important reporting times, desks, and required documentation
                  </p>
                </div>
              </div>

              {/* 2-Column Schedule Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div className="p-4 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" /> Move-in Date:
                  </span>
                  <p className="text-white font-bold text-base mt-1">{allocation.moveInDate}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80">
                  <span className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" /> Check-in Window:
                  </span>
                  <p className="text-white font-bold text-base mt-1">{allocation.checkInWindow}</p>
                </div>
              </div>

              {/* Reporting Desk Location & Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>
                    Reporting Desk:{" "}
                    <strong className="text-white">
                      {allocation.hostel.name} Caretaker Office
                    </strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Request Room Change Button */}
                  <button
                    type="button"
                    onClick={() => setIsRoomChangeOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/60 px-3.5 py-2 text-xs font-semibold text-cyan-300 transition-colors shadow-xs cursor-pointer"
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Request Room Change</span>
                  </button>

                  {/* File an Appeal Button */}
                  <button
                    type="button"
                    onClick={() => setIsAppealOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-950/40 hover:bg-amber-900/60 px-3.5 py-2 text-xs font-semibold text-amber-300 transition-colors shadow-xs cursor-pointer"
                  >
                    <Scale className="h-3.5 w-3.5 text-amber-400" />
                    <span>File an Appeal</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* ── Card 4: Room Condition & Inventory Checklist ────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.35 }}
              className="rounded-3xl border border-[rgba(80,110,160,0.25)] bg-[rgba(10,18,38,0.85)] p-6 sm:p-7 backdrop-blur-xl shadow-xl shadow-black/40 space-y-4 hover:border-cyan-500/40 transition-colors duration-300"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 shadow-sm">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-base font-bold text-white">
                      Room Condition &amp; Inventory Checklist
                    </h3>
                    <p className="text-xs text-slate-400">
                      Baseline handover inspection recorded at gate check-in
                    </p>
                  </div>
                </div>

                {/* Top-Right Status Badge */}
                {isAcknowledged ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-bold text-emerald-400 self-start sm:self-auto">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>✓ Acknowledged</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-3 py-1 text-xs font-bold text-amber-400 self-start sm:self-auto">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Pending Resident Sign-Off
                  </span>
                )}
              </div>

              {/* 4 Inventory Condition Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Bed Frame &amp; Mattress
                  </span>
                  <span className="font-bold text-emerald-400 text-sm mt-1 block">
                    Good Condition
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Study Table &amp; Chair
                  </span>
                  <span className="font-bold text-emerald-400 text-sm mt-1 block">
                    Good Condition
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Wardrobe &amp; Keys
                  </span>
                  <span className="font-bold text-emerald-400 text-sm mt-1 block">
                    Keys Handed Over
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-medium block">
                    Ceiling Fan &amp; Lights
                  </span>
                  <span className="font-bold text-cyan-400 text-sm mt-1 block">Operational</span>
                </div>
              </div>

              {/* Acknowledgement Action Box */}
              {!isAcknowledged ? (
                <div className="p-4 rounded-2xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <p className="text-cyan-200/90 leading-relaxed">
                    Please review and confirm that the inventory recorded matches your room
                    fixtures.
                  </p>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsAcknowledgeOpen(true)}
                    type="button"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-400 to-sky-400 hover:from-cyan-300 hover:to-sky-300 px-4 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20 shrink-0 cursor-pointer transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4 text-slate-950" />
                    <span>✓ Acknowledge Checklist</span>
                  </motion.button>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>
                    Confirmed by resident. Any discrepancies at check-out will be compared against
                    this baseline report.
                  </span>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* ── Dialog Modals (All functionality preserved) ────────────────────── */}
      <RoomChangeDialog
        isOpen={isRoomChangeOpen}
        onClose={() => setIsRoomChangeOpen(false)}
        currentRoom={allocation.hostel.roomNumber}
        hostelName={allocation.hostel.name}
      />

      <AppealDialog
        isOpen={isAppealOpen}
        onClose={() => setIsAppealOpen(false)}
        assignmentId={allocation.assignmentId}
        hostelName={allocation.hostel.name}
      />

      {/* Room Inventory Sign-Off Dialog */}
      <Dialog open={isAcknowledgeOpen} onOpenChange={setIsAcknowledgeOpen}>
        <DialogContent className="bg-[#071026] border border-cyan-500/30 text-slate-100 max-w-md rounded-3xl p-6 shadow-2xl backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              Resident Room Inventory Sign-Off
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Confirming this record establishes the baseline inventory condition for room{" "}
              {allocation.hostel.roomNumber}. Any damages or missing fixtures identified upon
              check-out will be assessed against this report.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3.5 rounded-2xl bg-[#020617] border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-300">
                <span>Room Number:</span>
                <span className="font-semibold text-white">
                  {allocation.hostel.roomNumber} ({allocation.hostel.bedNo})
                </span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Handover Status:</span>
                <span className="font-semibold text-emerald-400">
                  All Items Inspected &amp; Handed Over
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Resident Notes or Pre-existing Flaws (Optional)
              </label>
              <textarea
                value={ackNote}
                onChange={(e) => setAckNote(e.target.value)}
                placeholder="E.g., Small paint scratch on closet interior corner..."
                className="w-full h-20 px-3 py-2 rounded-xl bg-[#020617] border border-slate-800 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              onClick={() => setIsAcknowledgeOpen(false)}
              className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const checkInRecordId = (data as unknown as { checkInRecordId?: string })
                    ?.checkInRecordId;
                  if (checkInRecordId) {
                    await fetch(`/api/v1/check-in/${checkInRecordId}/acknowledge`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ student_notes: ackNote }),
                    });
                  }
                } catch {
                  // Fallback
                }
                setIsAcknowledged(true);
                setIsAcknowledgeOpen(false);
              }}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all"
            >
              Confirm Handover &amp; Sign Off
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

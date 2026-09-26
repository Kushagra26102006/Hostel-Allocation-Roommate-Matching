"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Moon,
  Volume2,
  BookOpen,
  CheckCircle2,
  Sliders,
  Check,
  Thermometer,
} from "lucide-react";
import { StudentSidebar } from "@/components/shell/student-sidebar";
import { HarmonyScoreGauge } from "@/components/compatibility/harmony-score-gauge";
import {
  CompatibilityCategoryCard,
  type CategoryTheme,
} from "@/components/compatibility/compatibility-category-card";
import {
  MatchBreakdownCard,
  ExplainableMatchCard,
  PrivacySecurityCard,
  DealBreakerGuaranteeCard,
} from "@/components/compatibility/compatibility-summary-cards";
import { QuestionnaireCards } from "@/components/compatibility/questionnaire-cards";
import { PrivacyCentre } from "@/components/compatibility/privacy-centre";
import { ConsentPanel } from "@/components/compatibility/consent-panel";
import type {
  QuestionnaireDefinition,
  QuestionnaireAnswers,
  StudentResultData,
} from "@hostelhub/domain";
import { cn } from "@/lib/utils";

const QUESTIONNAIRE_DEF: QuestionnaireDefinition = {
  version: 1,
  title: "Lifestyle & Roommate Harmony Survey",
  items: [
    {
      key: "sleep",
      label: "What is your typical sleep routine on weekdays?",
      category: "ordinal",
      allowDealBreaker: true,
      options: [
        { label: "Early Bird (Sleep before 10:30 PM)", value: 1 },
        { label: "Moderate (Sleep 11:00 PM – 12:00 AM)", value: 2 },
        { label: "Night Owl (Sleep 12:30 AM – 2:00 AM)", value: 3 },
        { label: "Late Night Coder (Sleep after 2:30 AM)", value: 4 },
      ],
    },
    {
      key: "study",
      label: "How do you prefer the room environment during study hours?",
      category: "ordinal",
      allowDealBreaker: true,
      options: [
        { label: "Absolute Pin-Drop Silence Only", value: 1 },
        { label: "Quiet Room with Headphones Allowed", value: 2 },
        { label: "Casual Ambient Study with Soft Music", value: 3 },
        { label: "Collaborative Study & Discussion Welcome", value: 4 },
      ],
    },
    {
      key: "tidiness",
      label: "How clean and organized do you keep your living space?",
      category: "ordinal",
      allowDealBreaker: true,
      options: [
        { label: "Spotless: Bed made daily, desk organized", value: 1 },
        { label: "Neat: Cleaned 2–3 times a week", value: 2 },
        { label: "Relaxed: Weekend cleaning routine", value: 3 },
        { label: "Messy: Organized chaos", value: 4 },
      ],
    },
    {
      key: "noise",
      label: "What is your tolerance for room noise (speaker calls, videos)?",
      category: "ordinal",
      allowDealBreaker: true,
      options: [
        { label: "Headphones mandatory for all audio", value: 1 },
        { label: "Low volume speaker during daytime okay", value: 2 },
        { label: "Frequent speaker calls and videos normal", value: 3 },
      ],
    },
    {
      key: "guests",
      label: "What is your preference regarding friends visiting the room?",
      category: "ordinal",
      allowDealBreaker: false,
      options: [
        { label: "Study only with advance notice", value: 1 },
        { label: "Casual daytime visits welcome", value: 2 },
        { label: "Open door: Friends visiting anytime", value: 3 },
      ],
    },
    {
      key: "temperature",
      label: "What is your preferred air conditioning / room temperature?",
      category: "ordinal",
      allowDealBreaker: false,
      options: [
        { label: "Cool & Chilled (18°C – 20°C)", value: 1 },
        { label: "Moderate Comfort (22°C – 24°C)", value: 2 },
        { label: "Natural Ventilation / Fan Preferred", value: 3 },
      ],
    },
    {
      key: "smoking",
      label: "Campus smoking policy compliance preference:",
      category: "categorical",
      allowDealBreaker: true,
      options: [
        { label: "Strict Non-Smoker Only (Zero Tolerance)", value: "non_smoker" },
        { label: "Comfortable with any resident", value: "tolerant" },
      ],
    },
  ],
};

interface DimensionData {
  name: string;
  score: number;
  note: string;
  icon: typeof Moon;
  theme: CategoryTheme;
}

const DEFAULT_DIMENSIONS: DimensionData[] = [
  {
    name: "Sleep Schedule Alignment",
    score: 98,
    note: "Both sleep 12:30 AM – 7:30 AM",
    icon: Moon,
    theme: "cyan",
  },
  {
    name: "Study Quietness Preference",
    score: 95,
    note: "Both prefer headphone-focused study",
    icon: BookOpen,
    theme: "violet",
  },
  {
    name: "Room Cleanliness Standard",
    score: 92,
    note: "Both follow 2–3x weekly cleaning",
    icon: Sparkles,
    theme: "emerald",
  },
  {
    name: "Noise & Audio Policy",
    score: 96,
    note: "Mutual agreement on headphone calls",
    icon: Volume2,
    theme: "blue",
  },
  {
    name: "AC Temperature Preference",
    score: 90,
    note: "Both comfortable at 22°C – 24°C",
    icon: Thermometer,
    theme: "orange",
  },
  {
    name: "Smoking & Substance Policy",
    score: 100,
    note: "Zero-tolerance non-smoker agreement",
    icon: ShieldCheck,
    theme: "green",
  },
];

export default function StudentRoommatePage() {
  const [activeTab, setActiveTab] = useState<"match" | "survey" | "privacy">("match");
  const [surveySubmitted, setSurveySubmitted] = useState<boolean>(true);
  const [allocationData, setAllocationData] = useState<StudentResultData | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchResult() {
      try {
        const res = await fetch("/api/v1/student/allocation-result");
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data?.hasAllocation) {
            setAllocationData(json.data);
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

  const roommateName = allocationData?.roommates?.[0]?.name || "Kabir Mehta";
  const roommateRoll = allocationData?.roommates?.[0]?.rollNumber || "22BCS058";
  const roommateBed = allocationData?.roommates?.[0]?.bedNo || "Bed A-304-2";
  const roommateRoom = allocationData
    ? `Room ${allocationData.hostel.roomNumber}, ${allocationData.hostel.name}`
    : "Room 304, Aryabhata Hall";
  const harmonyScore = allocationData?.score || 94;

  const handleSurveyCompleted = (answers: QuestionnaireAnswers) => {
    void answers;
    setSurveySubmitted(true);
    setActiveTab("match");
  };

  return (
    <div className="relative min-h-screen bg-[#020617] text-slate-100 selection:bg-cyan-500 selection:text-slate-950 overflow-x-hidden flex">
      {/* ── Background Ambient Light Spots & High-Tech Grid ────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[130px]" />
        <div className="absolute -bottom-32 left-1/3 h-[500px] w-[500px] rounded-full bg-cyan-600/10 blur-[140px]" />

        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      {/* ── Left Sidebar (Desktop: 240px, Collapsed on Mobile/Tablet) ──────── */}
      <StudentSidebar className="hidden lg:flex relative z-20" activeItem="roommate" />

      {/* ── Main Content Workspace ─────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* ── Page Hero Header ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="space-y-4"
        >
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/40 px-3.5 py-1 text-xs font-bold text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)] backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
            <span>✦ Fair &amp; Explainable Matching</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
                Roommate Compatibility Portal
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-400 max-w-3xl leading-relaxed">
                Algorithm-driven roommate pairing with transparent compatibility, privacy
                protection, and mutual deal-breaker verification.
              </p>
            </div>

            {/* Segmented Status Tabs Control */}
            <div className="inline-flex p-1.5 rounded-2xl border border-[rgba(80,120,170,0.3)] bg-[#071026]/90 backdrop-blur-xl shadow-lg shrink-0 overflow-x-auto max-w-full">
              <button
                type="button"
                onClick={() => setActiveTab("match")}
                className={cn(
                  "relative rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap",
                  activeTab === "match"
                    ? "bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400 text-slate-950 shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40",
                )}
              >
                Allocated Match ({harmonyScore}%)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("survey")}
                className={cn(
                  "relative rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap",
                  activeTab === "survey"
                    ? "bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400 text-slate-950 shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40",
                )}
              >
                Questionnaire {surveySubmitted ? "(Saved)" : ""}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("privacy")}
                className={cn(
                  "relative rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap",
                  activeTab === "privacy"
                    ? "bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400 text-slate-950 shadow-md shadow-cyan-500/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40",
                )}
              >
                Privacy &amp; Encryption
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── TAB 1: Allocated Match Analysis ───────────────────────────────── */}
        {activeTab === "match" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-8"
          >
            {/* ── 1. Roommate Profile Hero Card ─────────────────────────────── */}
            <div className="relative rounded-3xl border border-[rgba(80,120,170,0.3)] bg-gradient-to-br from-[#0c162e] via-[#071330] to-[#030b1c] p-6 sm:p-8 backdrop-blur-2xl shadow-2xl shadow-black/50 overflow-hidden">
              {/* Subtle top edge highlight */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
              {/* Ambient radial glow */}
              <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                {/* Left: Resident Avatar & Details */}
                <div className="flex items-center gap-5">
                  {/* Avatar KM with gradient ring */}
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-cyan-400 text-white font-black text-2xl shadow-xl ring-4 ring-cyan-500/20 group hover:ring-cyan-400/40 transition-all duration-300">
                    {roommateName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "KM"}
                    <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-[#0c162e] flex items-center justify-center shadow-xs">
                      <Check className="h-3 w-3 text-white stroke-[3]" />
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                        {roommateName}
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/35 px-2.5 py-0.5 text-xs font-bold text-emerald-400 font-mono">
                        <CheckCircle2 className="h-3 w-3" />
                        Allocated Roommate
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 font-medium">
                      BTech Computer Science &amp; Engineering • 5th Semester
                    </p>

                    <p className="text-xs font-mono font-semibold text-cyan-400 mt-1 flex items-center gap-2">
                      <span>{roommateRoom}</span>
                      <span className="text-slate-600">•</span>
                      <span>{roommateBed}</span>
                      <span className="text-slate-600">•</span>
                      <span>Roll: {roommateRoll}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Prominent Harmony Score Gauge */}
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-3xl bg-[#040919]/80 border border-slate-800/80 shadow-inner">
                  <HarmonyScoreGauge score={harmonyScore} size={130} strokeWidth={11} />

                  <div className="text-center sm:text-left space-y-1 sm:pr-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 block">
                      OPTIMAL COHORT MATCH
                    </span>
                    <h3 className="font-heading text-base font-bold text-white">
                      94% Compatibility
                    </h3>
                    <p className="text-xs text-slate-400 max-w-[190px] leading-relaxed">
                      Generated from synchronized quiet study habits and nocturnal sleeping
                      preference.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── 2. Compatibility Dashboard (6 Categories) ─────────────────── */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-cyan-400 block">
                    COMPATIBILITY METRICS
                  </span>
                  <h2 className="font-heading text-xl font-bold text-white mt-0.5">
                    Lifestyle Alignment Dashboard
                  </h2>
                </div>
                <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                  6 Vectors Evaluated
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {DEFAULT_DIMENSIONS.map((dim, idx) => (
                  <CompatibilityCategoryCard
                    key={dim.name}
                    name={dim.name}
                    score={dim.score}
                    note={dim.note}
                    icon={dim.icon}
                    theme={dim.theme}
                    index={idx}
                  />
                ))}
              </div>
            </div>

            {/* ── 3. Match Breakdown & Explainable AI Matching ──────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5">
                <MatchBreakdownCard />
              </div>
              <div className="lg:col-span-7">
                <ExplainableMatchCard />
              </div>
            </div>

            {/* ── 4. Privacy & Security Trust Card ─────────────────────────── */}
            <PrivacySecurityCard />

            {/* ── 5. Mutual Deal-Breaker Guarantee ─────────────────────────── */}
            <DealBreakerGuaranteeCard />
          </motion.div>
        )}

        {/* ── TAB 2: Interactive Lifestyle Questionnaire ────────────────────── */}
        {activeTab === "survey" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-6"
          >
            <div className="text-center max-w-lg mx-auto space-y-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-xs font-semibold text-cyan-300 font-mono">
                <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                <span>Preference Discovery</span>
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white">
                Lifestyle Preferences Questionnaire
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Configure your habits across 7 dimensions. All answers are encrypted with
                AES-256-GCM prior to cohort optimization.
              </p>
            </div>

            <QuestionnaireCards
              definition={QUESTIONNAIRE_DEF}
              onCompleted={handleSurveyCompleted}
            />
          </motion.div>
        )}

        {/* ── TAB 3: Privacy & Encryption Controls ─────────────────────────── */}
        {activeTab === "privacy" && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="space-y-8"
          >
            <ConsentPanel onConsentGranted={() => setActiveTab("survey")} />
            <PrivacyCentre />
          </motion.div>
        )}
      </div>
    </div>
  );
}

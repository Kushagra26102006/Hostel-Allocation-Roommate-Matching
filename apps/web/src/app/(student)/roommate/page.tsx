"use client";

import React, { useState } from "react";
import { Users, Sparkles, ShieldCheck, Moon, Volume2, BookOpen, Coffee } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { QuestionnaireCards } from "@/components/compatibility/questionnaire-cards";
import { PrivacyCentre } from "@/components/compatibility/privacy-centre";
import { ConsentPanel } from "@/components/compatibility/consent-panel";
import type { QuestionnaireDefinition, QuestionnaireAnswers } from "@hostelhub/domain";

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

export default function StudentRoommatePage() {
  const [activeTab, setActiveTab] = useState<"survey" | "match" | "privacy">("match");
  const [surveySubmitted, setSurveySubmitted] = useState(true);

  const currentMatch = {
    name: "Kabir Mehta",
    rollNo: "22BCS058",
    programme: "BTech Computer Science & Engineering",
    semester: "5th Semester",
    room: "Room 304, Aryabhata Hall",
    compatibilityScore: 94,
    dimensions: [
      {
        name: "Sleep Schedule Alignment",
        score: 98,
        note: "Both sleep 12:30 AM – 7:30 AM",
        icon: Moon,
      },
      {
        name: "Study Quietness Preference",
        score: 95,
        note: "Both prefer headphone-focused study",
        icon: BookOpen,
      },
      {
        name: "Room Cleanliness Standard",
        score: 92,
        note: "Both follow 2–3x weekly cleaning",
        icon: Sparkles,
      },
      {
        name: "Noise & Audio Policy",
        score: 96,
        note: "Mutual agreement on headphone calls",
        icon: Volume2,
      },
      {
        name: "AC Temperature Preference",
        score: 90,
        note: "Both comfortable at 22°C – 24°C",
        icon: Coffee,
      },
      {
        name: "Smoking & Substance Policy",
        score: 100,
        note: "Zero-tolerance non-smoker agreement",
        icon: ShieldCheck,
      },
    ],
  };

  const handleSurveyCompleted = (answers: QuestionnaireAnswers) => {
    void answers;
    setSurveySubmitted(true);
    setActiveTab("match");
  };

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300 mb-2">
            <Users className="h-3.5 w-3.5" />
            <span>Fair & Explainable Matching</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
            Roommate Compatibility Portal
          </h1>
          <p className="mt-1 text-sm text-muted">
            Algorithm-driven roommate pairing with mutual deal-breaker protection and differential
            privacy.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex rounded-xl border border-border/80 bg-muted/20 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("match")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "match" ? "bg-card text-text shadow-xs" : "text-muted hover:text-text"
            }`}
          >
            Allotted Match (94%)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("survey")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "survey" ? "bg-card text-text shadow-xs" : "text-muted hover:text-text"
            }`}
          >
            Questionnaire {surveySubmitted ? "(Saved)" : ""}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("privacy")}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === "privacy" ? "bg-card text-text shadow-xs" : "text-muted hover:text-text"
            }`}
          >
            Privacy & Encryption
          </button>
        </div>
      </div>

      {/* 2. TAB: Allotted Match Analysis */}
      {activeTab === "match" && (
        <div className="space-y-6">
          <GlassCard className="p-6">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-600 text-white font-extrabold text-xl shadow-md">
                  KM
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-heading text-2xl font-bold text-text">
                      {currentMatch.name}
                    </h2>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      Allotted Roommate
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-1">
                    {currentMatch.programme} • {currentMatch.semester}
                  </p>
                  <p className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                    {currentMatch.room}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center min-w-[180px]">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Harmony Score
                </span>
                <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {currentMatch.compatibilityScore}%
                </div>
                <span className="text-[11px] text-muted">Optimal Cohort Match</span>
              </div>
            </div>
          </GlassCard>

          {/* Compatibility Breakdown Dimensions */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {currentMatch.dimensions.map((dim) => (
              <GlassCard key={dim.name} className="p-5">
                <div className="flex items-start justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
                    <dim.icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {dim.score}% Match
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-text">{dim.name}</h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">{dim.note}</p>
                <div className="mt-3 h-1.5 w-full rounded-full bg-muted/20 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${dim.score}%` }}
                  />
                </div>
              </GlassCard>
            ))}
          </div>

          {/* Mutual Deal-Breaker Guarantee */}
          <GlassCard className="p-6 border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-base font-bold text-text">
                  Mutual Deal-Breaker Guarantee Verified (HC11)
                </h3>
                <p className="mt-1 text-xs text-muted leading-relaxed">
                  Both residents' zero-tolerance preferences were cross-verified by the allocation
                  engine prior to placement. No mutual conflict flags were raised for smoking,
                  sleeping routines, or study privacy.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 3. TAB: Interactive Questionnaire Cards */}
      {activeTab === "survey" && (
        <div className="mx-auto max-w-xl">
          <div className="text-center mb-6">
            <h2 className="font-heading text-2xl font-bold text-text">
              Lifestyle Preferences Questionnaire
            </h2>
            <p className="text-xs text-muted mt-1">
              Swipe or select your habits across 7 dimensions. All answers are encrypted with
              AES-256-GCM.
            </p>
          </div>

          <QuestionnaireCards definition={QUESTIONNAIRE_DEF} onCompleted={handleSurveyCompleted} />
        </div>
      )}

      {/* 4. TAB: Privacy & Differential Privacy */}
      {activeTab === "privacy" && (
        <div className="space-y-6">
          <ConsentPanel onConsentGranted={() => setActiveTab("survey")} />
          <PrivacyCentre />
        </div>
      )}
    </div>
  );
}

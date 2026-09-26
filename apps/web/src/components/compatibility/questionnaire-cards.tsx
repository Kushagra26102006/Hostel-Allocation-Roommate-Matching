"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import {
  ArrowRight,
  SkipForward,
  CheckCircle2,
  Sliders,
  ShieldAlert,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { QuestionnaireDefinition, QuestionnaireAnswers } from "@hostelhub/domain";

interface QuestionnaireCardsProps {
  definition: QuestionnaireDefinition;
  onCompleted: (answers: QuestionnaireAnswers) => void;
}

export function QuestionnaireCards({ definition, onCompleted }: QuestionnaireCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [selectedOption, setSelectedOption] = useState<number | string | null>(null);
  const [importance, setImportance] = useState<number>(2);
  const [dealBreaker, setDealBreaker] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const totalItems = definition.items.length;
  const currentItem = definition.items[currentIndex];
  const progressPercent = Math.round(((currentIndex + 1) / totalItems) * 100);

  // Framer motion drag values
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleNext = () => {
    if (!currentItem) return;

    const updatedAnswers = { ...answers };

    // Record answer if option was selected
    if (selectedOption !== null) {
      updatedAnswers[currentItem.key] = {
        value: selectedOption,
        importance,
        ...(currentItem.allowDealBreaker ? { dealBreaker } : {}),
      };
      setAnswers(updatedAnswers);
    }

    if (currentIndex < totalItems - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setImportance(2);
      setDealBreaker(false);
      x.set(0);
    } else {
      // Completed all questions
      submitAllAnswers(updatedAnswers);
    }
  };

  const handleSkip = () => {
    if (currentIndex < totalItems - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setImportance(2);
      setDealBreaker(false);
      x.set(0);
    } else {
      submitAllAnswers(answers);
    }
  };

  const submitAllAnswers = async (finalAnswers: QuestionnaireAnswers) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/me/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: finalAnswers }),
      });

      if (res.ok) {
        onCompleted(finalAnswers);
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to save questionnaire responses.");
      }
    } catch {
      alert("Error saving responses.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!currentItem) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-2 p-4 rounded-2xl bg-[#081124]/80 border border-slate-800/80">
        <div className="flex justify-between text-xs font-mono font-semibold">
          <span className="text-cyan-400">
            Question {currentIndex + 1} of {totalItems}
          </span>
          <span className="text-emerald-400">{progressPercent}% Complete</span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Swipeable Question Card */}
      <div className="relative min-h-[440px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.key}
            style={{ x, rotate, opacity }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x > 100) {
                handleNext();
              } else if (info.offset.x < -100) {
                handleSkip();
              }
            }}
            className="w-full cursor-grab active:cursor-grabbing"
          >
            <div className="rounded-3xl border border-[rgba(80,120,170,0.25)] bg-[rgba(8,17,36,0.92)] p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50 space-y-6">
              {/* Category & Label */}
              <div>
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                  {currentItem.category} Preference
                </span>
                <h2 className="font-heading text-xl sm:text-2xl font-bold text-white mt-1">
                  {currentItem.label}
                </h2>
              </div>

              {/* Option Selector */}
              <div className="space-y-2.5">
                {currentItem.options?.map((opt) => {
                  const isSelected = selectedOption === opt.value;
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setSelectedOption(opt.value)}
                      className={cn(
                        "w-full text-left p-4 rounded-2xl border text-xs sm:text-sm transition-all duration-200 flex items-center justify-between cursor-pointer",
                        isSelected
                          ? "border-cyan-400 bg-cyan-500/15 text-cyan-200 font-bold shadow-md shadow-cyan-500/10"
                          : "border-slate-800/80 hover:border-slate-700 bg-[#050b1d]/80 text-slate-300",
                      )}
                    >
                      <span>{opt.label}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-700 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Importance Slider (1-3) */}
              <div className="p-4 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold flex items-center gap-1.5 text-slate-300">
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" /> How important is this to you?
                  </span>
                  <span className="font-bold text-cyan-400 font-mono">
                    {importance === 1 ? "Low" : importance === 2 ? "Medium" : "High"} Priority
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={importance}
                  onChange={(e) => setImportance(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>Flexible</span>
                  <span>Standard</span>
                  <span>Strict Requirement</span>
                </div>
              </div>

              {/* Optional Deal Breaker Switch */}
              {currentItem.allowDealBreaker && (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-xs text-amber-300 font-semibold">
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <span>Strict Deal Breaker?</span>
                      <p className="text-[10px] text-slate-400 font-normal">
                        Reject cohort pairings that conflict with this preference
                      </p>
                    </div>
                  </div>
                  <Switch checked={dealBreaker} onCheckedChange={setDealBreaker} />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={handleSkip}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
        >
          <SkipForward className="w-4 h-4" /> Skip Question
        </button>

        <button
          type="button"
          onClick={handleNext}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all cursor-pointer disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : currentIndex === totalItems - 1 ? (
            <>
              <Sparkles className="w-4 h-4" /> Complete &amp; Save
            </>
          ) : (
            <>
              Next Question <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

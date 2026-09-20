"use client";

import React, { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { ArrowRight, SkipForward, CheckCircle2, Sliders, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleNext = () => {
    if (!currentItem) return;

    let updatedAnswers = { ...answers };

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
    // Skipping leaves item out of answers (never penalises student)
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
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress Header */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-muted">
          <span>Question {currentIndex + 1} of {totalItems}</span>
          <span>{progressPercent}% Complete</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Swipeable Card Stack */}
      <div className="relative min-h-[420px] flex items-center justify-center">
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
            <Card className="border-border/60 bg-surface/90 backdrop-blur-md shadow-2xl p-6 space-y-6">
              <CardContent className="p-0 space-y-6">
                <div>
                  <span className="text-xs font-mono uppercase text-brand-400 tracking-wider">
                    {currentItem.category} preference
                  </span>
                  <h2 className="text-xl font-bold text-text mt-1">{currentItem.label}</h2>
                </div>

                {/* Option Selector */}
                <div className="space-y-2">
                  {currentItem.options?.map((opt) => (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => setSelectedOption(opt.value)}
                      className={cn(
                        "w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-center justify-between",
                        selectedOption === opt.value
                          ? "border-brand-500 bg-brand-500/10 text-brand-300 font-semibold"
                          : "border-border/60 hover:border-border bg-surface/40 text-text",
                      )}
                    >
                      <span>{opt.label}</span>
                      {selectedOption === opt.value && <CheckCircle2 className="w-4 h-4 text-brand-400" />}
                    </button>
                  ))}
                </div>

                {/* Importance Slider (1-3) */}
                <div className="p-4 rounded-xl bg-surface/50 border border-border/40 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold flex items-center gap-1.5 text-muted">
                      <Sliders className="w-3.5 h-3.5" /> How important is this to you?
                    </span>
                    <span className="font-bold text-brand-400">
                      {importance === 1 ? "Low" : importance === 2 ? "Medium" : "High"}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={1}
                    value={importance}
                    onChange={(e) => setImportance(Number(e.target.value))}
                    className="w-full accent-brand-500 cursor-pointer"
                  />
                </div>

                {/* Optional Deal Breaker Switch */}
                {currentItem.allowDealBreaker && (
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                      <ShieldAlert className="w-4 h-4" /> Strictly Deal Breaker?
                    </div>
                    <Switch checked={dealBreaker} onCheckedChange={setDealBreaker} />
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action Footer Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" size="sm" onClick={handleSkip} className="text-muted hover:text-text">
          <SkipForward className="w-4 h-4 mr-2" /> Skip Question
        </Button>

        <Button
          onClick={handleNext}
          disabled={submitting}
          className="bg-brand-600 hover:bg-brand-700 text-white font-bold"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : currentIndex === totalItems - 1 ? (
            <>
              <Sparkles className="w-4 h-4 mr-2" /> Complete & Save
            </>
          ) : (
            <>
              Next Question <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

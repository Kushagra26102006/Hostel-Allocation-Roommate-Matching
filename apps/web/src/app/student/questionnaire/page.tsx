"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useQuestionnaire, useSaveQuestionnaire } from "@/hooks/use-mock-api";
import {
  Lock,
  Moon,
  Volume2,
  Sparkles,
  Trash2,
  Save,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import type { QuestionnaireAnswers } from "@/types";
import { toast } from "sonner";

export default function StudentQuestionnairePage() {
  const { data: initialData } = useQuestionnaire();
  const saveMutation = useSaveQuestionnaire();

  const [answers, setAnswers] = React.useState<QuestionnaireAnswers>({
    sleepSchedule: "night_owl",
    sleepScheduleImportance: 4,
    studyHabit: "quiet_silent",
    studyHabitImportance: 5,
    cleanliness: "meticulous",
    cleanlinessImportance: 4,
    noiseTolerance: "moderate",
    noiseToleranceImportance: 3,
    guestPolicy: "weekends_only",
    guestPolicyImportance: 3,
    smokingTolerance: "strictly_no",
    smokingToleranceImportance: 5,
    dietPreference: "vegetarian",
    dietPreferenceImportance: 2,
    hasConsented: true,
  });

  const [activeStep, setActiveStep] = React.useState(0);

  React.useEffect(() => {
    if (initialData) {
      setAnswers((prev) => ({
        ...prev,
        ...initialData,
        hasConsented: initialData.hasConsented ?? prev.hasConsented,
      }));
    }
  }, [initialData]);

  const handleSave = () => {
    saveMutation.mutate(answers, {
      onSuccess: () => toast.success("Lifestyle questionnaire saved privately!"),
    });
  };

  const handleDelete = () => {
    toast.info("All lifestyle responses erased. Compatibility matching set to neutral.");
  };

  const questions = [
    {
      title: "Sleep & Bedtime Routine",
      icon: Moon,
      subtitle: "When do you typically sleep on university weeknights?",
      field: "sleepSchedule" as const,
      importanceField: "sleepScheduleImportance" as const,
      options: [
        { id: "early_bird", label: "Early Bird", desc: "Sleep before 11:00 PM" },
        { id: "night_owl", label: "Night Owl", desc: "Sleep after 1:00 AM" },
        { id: "flexible", label: "Flexible", desc: "Midnight depending on academic workload" },
      ],
    },
    {
      title: "Study Atmosphere & Room Noise",
      icon: Volume2,
      subtitle: "How important is a quiet study environment in your shared room?",
      field: "studyHabit" as const,
      importanceField: "studyHabitImportance" as const,
      options: [
        {
          id: "quiet_silent",
          label: "Pin-Drop Silence",
          desc: "Strict study focus, no speaker audio in room",
        },
        {
          id: "background_music",
          label: "Ambient / Low Noise",
          desc: "Soft music or headphones preferred",
        },
        {
          id: "group_study",
          label: "Collaborative Study",
          desc: "Discussion and group problem-solving friendly",
        },
      ],
    },
    {
      title: "Cleanliness & Organization Standard",
      icon: Sparkles,
      subtitle: "How strictly do you keep your study desk and room floor organized?",
      field: "cleanliness" as const,
      importanceField: "cleanlinessImportance" as const,
      options: [
        {
          id: "meticulous",
          label: "Meticulous",
          desc: "Daily tidying, zero clutter on floor and desks",
        },
        { id: "moderate", label: "Moderate", desc: "Weekly cleanup routine, reasonable order" },
        { id: "relaxed", label: "Relaxed", desc: "Casual living environment" },
      ],
    },
  ];

  const q = questions[activeStep]!;
  const Icon = q.icon;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 space-y-7 animate-in fade-in duration-200">
      {/* Header & Privacy Notice */}
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
          <Lock className="h-3.5 w-3.5" />
          <span>Encrypted Compatibility Engine</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Lifestyle Compatibility Matching
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Your answers are encrypted and used solely for Gale-Shapley roommate compatibility
          pairing. Individual answers are never exposed to other students or ordinary staff.
        </p>
      </div>

      {/* Privacy Guarantee Card */}
      <div className="rounded-xl border border-brand-200/80 bg-brand-50/50 dark:bg-brand-950/20 dark:border-brand-900/40 p-4">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-brand-600 dark:text-brand-400 mt-0.5 shrink-0" />
          <div className="text-xs leading-relaxed text-foreground/90">
            <strong>Privacy Guarantee:</strong> Compatibility scores are aggregated mathematically.
            Raw individual answers remain strictly confidential. You may reset or erase your
            responses at any time.
          </div>
        </div>
      </div>

      {/* Step Progress Pills */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {questions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveStep(idx)}
              className={`h-2 rounded-full transition-all duration-200 ${
                idx === activeStep
                  ? "w-8 bg-brand-500"
                  : "w-2 bg-surface-muted border border-border/60"
              }`}
              aria-label={`Jump to question ${idx + 1}`}
            />
          ))}
        </div>
        <span className="text-xs text-muted">
          Question <strong className="text-foreground">{activeStep + 1}</strong> of{" "}
          {questions.length}
        </span>
      </div>

      {/* Active Question Card */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300 shrink-0">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">{q.title}</h2>
            <p className="text-xs sm:text-sm text-muted mt-0.5">{q.subtitle}</p>
          </div>
        </div>

        {/* Choice Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {q.options.map((opt) => {
            const isSelected = answers[q.field] === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setAnswers({ ...answers, [q.field]: opt.id })}
                className={`flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.98] ${
                  isSelected
                    ? "border-brand-500 bg-brand-50/70 dark:bg-brand-950/40 text-foreground font-semibold shadow-2xs"
                    : "border-border/70 hover:border-border hover:bg-surface-muted/50 text-foreground"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 text-brand-600 dark:text-brand-400" />}
                  </div>
                  <p className="text-xs text-muted mt-1.5 font-normal leading-relaxed">
                    {opt.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Importance Rating Weight Slider */}
        <div className="rounded-xl border border-border/60 bg-surface-muted/30 p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground">Importance Weight for Matching:</span>
            <span className="font-bold text-brand-600 dark:text-brand-400">
              {answers[q.importanceField] === 5
                ? "5 - Critical Dealbreaker"
                : answers[q.importanceField] === 4
                  ? "4 - Highly Important"
                  : answers[q.importanceField] === 3
                    ? "3 - Moderate Preference"
                    : answers[q.importanceField] === 2
                      ? "2 - Minor Preference"
                      : "1 - Low Importance"}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((val) => {
              const isSelected = answers[q.importanceField] === val;
              return (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAnswers({ ...answers, [q.importanceField]: val })}
                  className={`h-9 rounded-lg text-xs font-bold transition-all ${
                    isSelected
                      ? "bg-brand-500 text-white shadow-2xs"
                      : "bg-surface border border-border/70 text-muted hover:text-foreground hover:bg-surface-muted"
                  }`}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Step Controls */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
          >
            <ChevronLeft className="mr-1.5 h-4 w-4" />
            Previous
          </Button>

          {activeStep < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setActiveStep((prev) => Math.min(questions.length - 1, prev + 1))}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              Next Question
              <ChevronRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {saveMutation.isPending ? "Saving..." : "Save Questionnaire"}
            </Button>
          )}
        </div>
      </div>

      {/* Global Actions */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs"
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
          Erase All Responses
        </Button>

        <Button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs shadow-xs"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          {saveMutation.isPending ? "Saving..." : "Save All Preferences"}
        </Button>
      </div>
    </div>
  );
}

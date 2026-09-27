"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useQuestionnaire, useSaveQuestionnaire } from "@/hooks/use-mock-api";
import {
  Lock,
  Moon,
  Volume2,
  Trash2,
  Save,
  ShieldCheck,
  Check,
  ChevronRight,
  ChevronLeft,
  Coffee,
  Users,
  Cigarette,
  Utensils,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import type { MockQuestionnaireAnswer } from "@/lib/api/mock/data";

export default function StudentQuestionnairePage() {
  const { data: initialData } = useQuestionnaire();
  const saveMutation = useSaveQuestionnaire();

  const [answers, setAnswers] = React.useState<MockQuestionnaireAnswer>({
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
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  React.useEffect(() => {
    if (initialData) {
      setAnswers((prev) => ({
        ...prev,
        ...initialData,
        hasConsented: initialData.hasConsented ?? prev.hasConsented ?? true,
      }));
    }
  }, [initialData]);

  const questions = [
    {
      title: "Sleep & Bedtime Routine",
      icon: Moon,
      subtitle: "When do you typically sleep on university weeknights?",
      field: "sleepSchedule" as const,
      importanceField: "sleepScheduleImportance" as const,
      options: [
        { id: "early_bird", label: "Early Bird", desc: "Sleep before 11:00 PM, wake early" },
        { id: "night_owl", label: "Night Owl", desc: "Sleep after 1:00 AM, study late" },
        { id: "flexible", label: "Flexible", desc: "Varies depending on coursework & exams" },
      ],
    },
    {
      title: "Study Atmosphere & Room Noise",
      icon: Volume2,
      subtitle: "How do you prefer your shared study room environment?",
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
          label: "Ambient / Low Audio",
          desc: "Headphones or soft ambient focus music preferred",
        },
        {
          id: "group_study",
          label: "Collaborative Study",
          desc: "Discussion and group problem-solving friendly",
        },
      ],
    },
    {
      title: "Cleanliness & Room Tidiness",
      icon: Coffee,
      subtitle: "How clean and organized do you keep your shared room?",
      field: "cleanliness" as const,
      importanceField: "cleanlinessImportance" as const,
      options: [
        {
          id: "meticulous",
          label: "Meticulous",
          desc: "Daily bed made, clean desk, trash emptied",
        },
        { id: "moderate", label: "Moderate", desc: "Weekly scheduled cleanup, reasonably tidy" },
        { id: "relaxed", label: "Relaxed", desc: "Comfortable with lived-in space and clutter" },
      ],
    },
    {
      title: "Noise & Media Tolerance",
      icon: Volume2,
      subtitle: "What is your tolerance for room chatter, gaming, and calls?",
      field: "noiseTolerance" as const,
      importanceField: "noiseToleranceImportance" as const,
      options: [
        { id: "low", label: "Low Tolerance", desc: "Prefer quiet hours strictly respected" },
        {
          id: "moderate",
          label: "Moderate",
          desc: "Normal daytime conversations & calls acceptable",
        },
        {
          id: "high",
          label: "High Tolerance",
          desc: "Comfortable with active room background chatter",
        },
      ],
    },
    {
      title: "Guest & Visitor Policy",
      icon: Users,
      subtitle: "How should visitors and friends be accommodated in the room?",
      field: "guestPolicy" as const,
      importanceField: "guestPolicyImportance" as const,
      options: [
        {
          id: "strictly_no",
          label: "Strictly No Guests",
          desc: "Shared room is private sanctuary only",
        },
        {
          id: "weekends_only",
          label: "Daytime / Weekends Only",
          desc: "Occasional study partner visits",
        },
        {
          id: "flexible",
          label: "Flexible Policy",
          desc: "Friends welcome with mutual prior notice",
        },
      ],
    },
    {
      title: "Smoking & Substance Tolerance",
      icon: Cigarette,
      subtitle: "What is your stance regarding tobacco and substance usage?",
      field: "smokingTolerance" as const,
      importanceField: "smokingToleranceImportance" as const,
      options: [
        {
          id: "strictly_no",
          label: "Strictly Non-Smoking",
          desc: "Zero smoke tolerance in room or wing",
        },
        {
          id: "outside_only",
          label: "Designated Outdoor Only",
          desc: "Strictly outside hostel blocks only",
        },
        { id: "tolerant", label: "Tolerant", desc: "Flexible with peer lifestyle choices" },
      ],
    },
    {
      title: "Dietary Preferences & Habits",
      icon: Utensils,
      subtitle: "What dietary preferences do you observe in shared living?",
      field: "dietPreference" as const,
      importanceField: "dietPreferenceImportance" as const,
      options: [
        { id: "vegetarian", label: "Vegetarian Only", desc: "Prefer vegetarian shared space" },
        {
          id: "non_vegetarian",
          label: "Non-Vegetarian",
          desc: "Comfortable with any food choices",
        },
        { id: "vegan", label: "Vegan / Plant-Based", desc: "Strictly plant-based preference" },
        { id: "any", label: "No Preference", desc: "Any dietary habits acceptable" },
      ],
    },
  ];

  const currentQ = questions[activeStep]!;
  const currentVal = (answers[currentQ.field] as string) || "";
  const currentImportance = Number(answers[currentQ.importanceField] ?? 3);

  const handleSelectOption = (optionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.field]: optionId,
    }));
  };

  const handleImportanceChange = (val: number) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQ.importanceField]: val,
    }));
  };

  const handleSave = () => {
    saveMutation.mutate(answers, {
      onSuccess: () => toast.success("Lifestyle survey saved and salted for matching!"),
    });
  };

  const handleEraseAll = () => {
    setAnswers({
      sleepSchedule: "flexible",
      sleepScheduleImportance: 1,
      studyHabit: "background_music",
      studyHabitImportance: 1,
      cleanliness: "moderate",
      cleanlinessImportance: 1,
      noiseTolerance: "moderate",
      noiseToleranceImportance: 1,
      guestPolicy: "flexible",
      guestPolicyImportance: 1,
      smokingTolerance: "strictly_no",
      smokingToleranceImportance: 5,
      dietPreference: "any",
      dietPreferenceImportance: 1,
      hasConsented: false,
    });
    setShowDeleteConfirm(false);
    toast.info("All questionnaire answers erased. Matching vector reset to neutral.");
  };

  const progressPct = Math.round(((activeStep + 1) / questions.length) * 100);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-7 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Lock className="h-3.5 w-3.5" />
            <span>Cryptographically Salted Matching Vector</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Lifestyle Compatibility Survey
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Individual answers are NEVER revealed to classmates or wardens. Only mathematical
            compatibility vectors are compared.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 min-target-size"
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            <span>Erase Data</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs min-target-size"
          >
            <Save className="mr-1.5 h-3.5 w-3.5" />
            <span>{saveMutation.isPending ? "Saving..." : "Save Answers"}</span>
          </Button>
        </div>
      </div>

      {/* Privacy Guarantee Banner */}
      <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 via-brand-500/5 to-cyan-500/10 p-4 sm:p-5 flex items-start gap-3.5">
        <ShieldCheck className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <strong className="text-foreground font-semibold">
            Zero-Knowledge Roommate Matching:{" "}
          </strong>
          Your answers are salted with your student hash and converted into an anonymized
          multi-dimensional cosine vector. Roommate pairs only see the overall compatibility score
          (e.g. 92%), ensuring full privacy of personal daily habits.
        </div>
      </div>

      {/* Progress Bar & Counter */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted font-medium">
          <span>
            Question {activeStep + 1} of {questions.length}
          </span>
          <span className="font-bold text-brand-600 dark:text-brand-400">
            {progressPct}% Completed
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden border border-border/50">
          <div
            className="h-full bg-gradient-to-r from-brand-600 to-accent rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Active Question Card */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 shrink-0 mt-0.5">
            <currentQ.icon className="h-6 w-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
              Habit Category {activeStep + 1}
            </span>
            <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground mt-0.5">
              {currentQ.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted mt-1 leading-relaxed">
              {currentQ.subtitle}
            </p>
          </div>
        </div>

        {/* Answer Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
          {currentQ.options.map((opt) => {
            const isSelected = currentVal === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectOption(opt.id)}
                className={`p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between min-target-size ${
                  isSelected
                    ? "border-brand-500 bg-brand-500/10 text-foreground ring-2 ring-brand-500/20 shadow-xs"
                    : "border-border/70 bg-surface hover:bg-surface-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-sm font-bold text-foreground">
                      {opt.label}
                    </span>
                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-white">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted mt-1.5 leading-relaxed">{opt.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Importance Weight Slider */}
        <div className="p-4 rounded-2xl bg-surface-muted/50 border border-border/60 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <div>
              <span className="font-bold text-foreground block">
                Priority Weight for this Habit
              </span>
              <span className="text-[11px] text-muted">
                How crucial is alignment on this habit to your peaceful living?
              </span>
            </div>
            <span className="font-bold text-brand-600 dark:text-brand-400 text-sm">
              Level {currentImportance} / 5
            </span>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => handleImportanceChange(lvl)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all min-target-size ${
                  currentImportance >= lvl
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-surface text-muted border border-border/70 hover:bg-surface-muted"
                }`}
              >
                {lvl === 1 ? "Low" : lvl === 3 ? "Medium" : lvl === 5 ? "Crucial" : lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Prev / Next Navigation */}
        <div className="flex items-center justify-between border-t border-border/60 pt-5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            disabled={activeStep === 0}
            className="text-xs min-target-size"
          >
            <ChevronLeft className="mr-1.5 h-3.5 w-3.5" />
            <span>Previous Question</span>
          </Button>

          <div className="flex items-center gap-2">
            {activeStep < questions.length - 1 ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setActiveStep((prev) => Math.min(questions.length - 1, prev + 1))}
                className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold min-target-size"
              >
                <span>Next Question</span>
                <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSave}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold min-target-size"
              >
                <Check className="mr-1.5 h-3.5 w-3.5" />
                <span>Save All Answers</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Erase All Responses Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md p-6 bg-surface text-foreground border-border/80">
          <DialogHeader className="text-left space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-base font-bold">
              Erase All Lifestyle Survey Responses?
            </DialogTitle>
            <DialogDescription className="text-xs text-muted leading-relaxed">
              This action permanently purges all salted answers from the matching ledger. Your
              roommate matching score will default to neutral baseline until new preferences are
              saved.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border/60">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="text-xs min-target-size"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleEraseAll}
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs min-target-size"
            >
              Confirm Erase Data
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

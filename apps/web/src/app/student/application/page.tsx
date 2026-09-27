"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Check,
  Users,
  Sliders,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";

const STEPS = [
  "Personal Information",
  "Academic Information",
  "Eligibility & Criteria",
  "Document Uploads",
  "Hostel Preferences",
  "Roommate Group",
  "Compatibility Survey",
  "Review Application",
  "Submit & Confirmation",
];

export default function StudentApplicationWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState("Just now");
  const [direction, setDirection] = React.useState(1);

  const [formData, setFormData] = React.useState({
    fullName: "Aarav Sharma",
    rollNo: "23CS10042",
    email: "aarav.sharma@nit.edu",
    phone: "+91 98765 43210",
    homeAddress: "Flat 402, Sea View Enclave, Mumbai, MH",
    distanceKm: "850",
    programme: "B.Tech Computer Science",
    department: "Computer Science & Engineering",
    year: "3",
    cgpa: "9.35",
    category: "General Merited",
    hasDisability: "no",
    preferredHostel: "Aryabhata Hall",
    preferredRoomType: "double_ac",
    specialNotes: "Require quiet study desk area.",
  });

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
      setLastSaved("Just now");
      toast.success("Autosaved draft progress");
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success("Hostel Application submitted successfully to the Warden Council!");
      router.push("/student/dashboard");
    }, 700);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6 animate-in fade-in duration-200">
      {/* Header and Autosave indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Fall 2026 Housing Application</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            All updates are autosaved securely to the university allocation ledger.
          </p>
        </div>

        {/* Autosave badge */}
        <div className="inline-flex items-center gap-2 rounded-lg border border-border/70 bg-surface px-3 py-1.5 text-xs text-muted shadow-2xs shrink-0 self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Autosaved: <strong className="font-medium text-foreground">{lastSaved}</strong>
          </span>
        </div>
      </div>

      {/* Desktop Stepper */}
      <div className="hidden md:block overflow-x-auto pb-2">
        <div className="flex items-center gap-1.5 min-w-max border-b border-border/50 pb-3">
          {STEPS.map((step, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setDirection(idx > currentStep ? 1 : -1);
                setCurrentStep(idx);
              }}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                idx === currentStep
                  ? "bg-brand-500 text-white font-semibold shadow-xs"
                  : idx < currentStep
                    ? "bg-surface-muted text-emerald-700 dark:text-emerald-400 font-medium"
                    : "text-muted hover:text-foreground hover:bg-surface-muted"
              }`}
            >
              {idx < currentStep ? (
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <span className="text-[11px] opacity-75">{idx + 1}.</span>
              )}
              <span className="truncate max-w-[110px]">{step}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Stepper Bar */}
      <div className="md:hidden rounded-lg border border-border/60 bg-surface p-3 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground">
            Step {currentStep + 1} of {STEPS.length}
          </span>
          <span className="text-muted">
            {Math.round(((currentStep + 1) / STEPS.length) * 100)}% Complete
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
          <div
            className="h-full bg-brand-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="text-xs font-medium text-brand-600 dark:text-brand-400 truncate">
          {STEPS[currentStep]}
        </p>
      </div>

      {/* Main Step Form Card with Slide + Fade Transition */}
      <div className="rounded-2xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: direction * 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 14 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Step 0: Personal Info */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="rollNo">University Roll Number</Label>
                    <Input
                      id="rollNo"
                      value={formData.rollNo}
                      disabled
                      className="mt-1.5 bg-surface-muted"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Campus Email</Label>
                    <Input
                      id="email"
                      value={formData.email}
                      disabled
                      className="mt-1.5 bg-surface-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="address">Permanent Home Address</Label>
                  <Input
                    id="address"
                    value={formData.homeAddress}
                    onChange={(e) => setFormData({ ...formData, homeAddress: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
              </div>
            )}

            {/* Step 1: Academic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="prog">Academic Programme</Label>
                    <Input
                      id="prog"
                      value={formData.programme}
                      disabled
                      className="mt-1.5 bg-surface-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dept">Department</Label>
                    <Input
                      id="dept"
                      value={formData.department}
                      disabled
                      className="mt-1.5 bg-surface-muted"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="year">Current Year of Study</Label>
                    <Input
                      id="year"
                      value={formData.year}
                      disabled
                      className="mt-1.5 bg-surface-muted"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cgpa">Cumulative CGPA</Label>
                    <Input
                      id="cgpa"
                      value={formData.cgpa}
                      disabled
                      className="mt-1.5 bg-surface-muted"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Eligibility */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-surface-muted/40 p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>Eligibility Verification Criteria</span>
                  </div>
                  <ul className="mt-2.5 space-y-1.5 text-xs text-muted list-disc list-inside">
                    <li>
                      Home Distance: &gt; 50km from campus (Your verified distance: 850 km) &bull;{" "}
                      <strong className="text-emerald-600 font-semibold">Passed</strong>
                    </li>
                    <li>
                      Disciplinary Clearance: No active university sanctions &bull;{" "}
                      <strong className="text-emerald-600 font-semibold">Cleared</strong>
                    </li>
                    <li>
                      Hostel Account: Previous semester mess and maintenance dues cleared &bull;{" "}
                      <strong className="text-emerald-600 font-semibold">Cleared</strong>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 3: Documents */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div>
                  <h3 className="font-heading text-base font-bold text-foreground">
                    Upload Verification Documents
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Please provide authentic documents (PDF or JPEG format, max 10MB each).
                  </p>
                </div>
                <FileUploader />
              </div>
            )}

            {/* Step 4: Preferences */}
            {currentStep === 4 && (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                  <Sliders className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Hostel Preference Rankings
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  You have configured 3 ranked residences. The Gale-Shapley matching algorithm will
                  honor your priority order.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <a href="/student/preferences">Configure Rankings</a>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Roommate Group */}
            {currentStep === 5 && (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Roommate Group Pairing
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Paired with <strong className="text-foreground">Rohan Deshmukh</strong> (Group
                  Code: RM-4089, Mutual Consent Confirmed).
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <a href="/student/group">Manage Roommate Group</a>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Compatibility */}
            {currentStep === 6 && (
              <div className="space-y-4 text-center py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <h3 className="font-heading text-base font-bold text-foreground">
                  Lifestyle Compatibility Survey
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto">
                  Survey completed &bull; 92% mutual compatibility rating with selected roommate.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <Button asChild size="sm" variant="outline">
                    <a href="/student/questionnaire">View Survey Answers</a>
                  </Button>
                </div>
              </div>
            )}

            {/* Step 7: Review */}
            {currentStep === 7 && (
              <div className="space-y-4 text-xs">
                <h3 className="font-heading text-base font-bold text-foreground">
                  Review Application Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/70 p-3.5 bg-surface-muted/30">
                    <span className="font-semibold text-muted">Applicant</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {formData.fullName} ({formData.rollNo})
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3.5 bg-surface-muted/30">
                    <span className="font-semibold text-muted">Academic Record</span>
                    <p className="font-bold text-foreground mt-0.5">
                      {formData.programme} &bull; CGPA {formData.cgpa}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3.5 bg-surface-muted/30">
                    <span className="font-semibold text-muted">1st Choice Residence</span>
                    <p className="font-bold text-foreground mt-0.5">Aryabhata Hall (Double AC)</p>
                  </div>
                  <div className="rounded-xl border border-border/70 p-3.5 bg-surface-muted/30">
                    <span className="font-semibold text-muted">Roommate Pair</span>
                    <p className="font-bold text-foreground mt-0.5">Rohan Deshmukh (92% Match)</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Submit Confirmation */}
            {currentStep === 8 && (
              <div className="space-y-4 text-center py-6">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  Ready to Submit Application
                </h3>
                <p className="text-xs text-muted max-w-md mx-auto leading-relaxed">
                  By submitting, you agree to university residential policies, the student code of
                  conduct, and authorize the Gale-Shapley matching engine to compute your room
                  assignment.
                </p>
                <div className="pt-2">
                  <Button
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-sm"
                  >
                    {isSubmitting
                      ? "Submitting to Warden Ledger..."
                      : "Confirm & Submit Application"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Wizard Footer Controls */}
        <div className="mt-8 flex items-center justify-between border-t border-border/60 pt-4">
          <Button variant="outline" size="sm" onClick={prevStep} disabled={currentStep === 0}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Previous
          </Button>

          {currentStep < STEPS.length - 1 ? (
            <Button
              size="sm"
              onClick={nextStep}
              className="bg-brand-500 hover:bg-brand-600 text-white"
            >
              Next Step
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => router.push("/student/dashboard")}>
              Back to Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

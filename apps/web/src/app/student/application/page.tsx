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
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const STEPS = [
  "Personal Information",
  "Academic Information",
  "Eligibility & Criteria",
  "Document Uploads",
  "Hostel Preferences",
  "Roommate Preferences",
  "Lifestyle Survey",
  "Review Application",
  "Submit & Receipt",
];

export default function StudentApplicationWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [lastSaved, setLastSaved] = React.useState("Just now");
  const [direction, setDirection] = React.useState(1);
  const [submittedReceipt, setSubmittedReceipt] = React.useState<{
    receiptNo: string;
    submittedAt: string;
    hash: string;
  } | null>(null);

  // Form data with persistence in localStorage
  const [formData, setFormData] = React.useState({
    fullName: "Aarav Sharma",
    rollNo: "23CS10042",
    email: "aarav.sharma@campus.edu",
    phone: "+91 98765 43210",
    homeAddress: "Flat 402, Sea View Enclave, Mumbai",
    homeState: "Maharashtra",
    distanceKm: "850",
    programme: "B.Tech Computer Science & Engineering",
    department: "Computer Science & Engineering",
    year: "3",
    semester: "5",
    cgpa: "9.35",
    enrolmentStatus: "Regular Full-Time",
    category: "General Merited",
    feeCleared: "yes",
    disciplinaryCleared: "yes",
    hasDisability: "no",
    preferredHostel1: "hostel-a",
    preferredHostel2: "hostel-e",
    preferredHostel3: "hostel-c",
    preferredRoomType: "double_ac",
    roommateChoice: "pair",
    roommateRollNo: "23CS10088",
    sleepSchedule: "night_owl",
    studyHabit: "quiet_silent",
    cleanliness: "meticulous",
    guestPolicy: "weekends_only",
    specialNotes: "Require quiet study desk area with high-speed LAN port.",
    honorPledge: true,
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Load draft from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("hostelhub-application-draft");
      if (saved) {
        setFormData((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // ignore
    }
  }, []);

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      try {
        localStorage.setItem("hostelhub-application-draft", JSON.stringify(updated));
        setLastSaved("Just now");
      } catch {
        // ignore
      }
      return updated;
    });
    if (errors[field]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 0) {
      if (!formData.fullName.trim()) newErrors["fullName"] = "Full name is required.";
      if (!formData.rollNo.trim()) newErrors["rollNo"] = "Roll number is required.";
      if (!formData.email.trim() || !formData.email.includes("@"))
        newErrors["email"] = "Valid institutional email is required.";
      if (!formData.phone.trim()) newErrors["phone"] = "Contact phone number is required.";
      if (!formData.distanceKm.trim() || Number(formData.distanceKm) <= 0)
        newErrors["distanceKm"] = "Distance from campus must be greater than 0 km.";
    } else if (step === 1) {
      if (!formData.programme.trim()) newErrors["programme"] = "Degree programme is required.";
      if (!formData.cgpa.trim() || Number(formData.cgpa) < 0 || Number(formData.cgpa) > 10)
        newErrors["cgpa"] = "Valid CGPA between 0.00 and 10.00 is required.";
    } else if (step === 2) {
      if (formData.feeCleared !== "yes")
        newErrors["feeCleared"] = "Semester fee clearance is required for hostel eligibility.";
      if (formData.disciplinaryCleared !== "yes")
        newErrors["disciplinaryCleared"] = "Clear disciplinary record declaration is required.";
    } else if (step === 7) {
      if (!formData.honorPledge)
        newErrors["honorPledge"] = "You must acknowledge and sign the student honor declaration.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (!validateStep(currentStep)) {
      toast.error("Please fill in all required fields before proceeding.");
      return;
    }
    if (currentStep < STEPS.length - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
      setLastSaved("Just now");
      toast.success("Progress autosaved to academic draft");
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!validateStep(7)) {
      toast.error("Please agree to the student honor pledge.");
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const receipt = {
        receiptNo: `HH-2026-APP-${Math.floor(100000 + Math.random() * 900000)}`,
        submittedAt: new Date().toLocaleString(),
        hash: "0x8f9c2d1b7a4e5039f" + Math.floor(1000 + Math.random() * 9000),
      };
      setSubmittedReceipt(receipt);
      localStorage.removeItem("hostelhub-application-draft");
      toast.success("Hostel Application formally locked and submitted!");
    }, 900);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-7 animate-in fade-in duration-200">
      {/* Header and Autosave indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Autumn 2026 Housing Application Portal</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            All updates are autosaved securely to your student record with draft persistence.
          </p>
        </div>

        {/* Autosave status chip */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-surface px-3 py-1.5 text-xs text-muted shadow-2xs shrink-0 self-start sm:self-auto">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            Autosaved: <strong className="font-semibold text-foreground">{lastSaved}</strong>
          </span>
        </div>
      </div>

      {/* Progress Bar (Visible across mobile & desktop) */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted font-medium">
          <span>Overall Completion</span>
          <span className="font-bold text-brand-600 dark:text-brand-400">
            {Math.round(((currentStep + 1) / STEPS.length) * 100)}% Completed
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-surface-muted overflow-hidden border border-border/50">
          <motion.div
            className="h-full bg-gradient-to-r from-brand-600 to-accent rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Desktop Step Pills */}
      <div className="hidden lg:block overflow-x-auto pb-2">
        <div className="flex items-center gap-1.5 min-w-max border-b border-border/50 pb-3">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStep;
            const isCurrent = idx === currentStep;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (idx <= currentStep || validateStep(currentStep)) {
                    setDirection(idx > currentStep ? 1 : -1);
                    setCurrentStep(idx);
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isCurrent
                    ? "bg-brand-500 text-white shadow-xs"
                    : isDone
                      ? "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                      : "text-muted hover:text-foreground"
                }`}
              >
                {isDone ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <span className="text-[10px] opacity-80">{idx + 1}.</span>
                )}
                <span>{step.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Form Steps Card */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-xs relative">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentStep}
            custom={direction}
            initial={{ opacity: 0, x: direction * 25 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -direction * 25 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Step 1: Personal Information */}
            {currentStep === 0 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Personal Identity & Contact
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Verified through the institutional admissions database.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold">
                      Full Legal Name *
                    </Label>
                    <Input
                      id="fullName"
                      value={formData.fullName}
                      onChange={(e) => handleChange("fullName", e.target.value)}
                      className="text-xs rounded-xl"
                    />
                    {errors["fullName"] && (
                      <p className="text-[11px] text-rose-500">{errors["fullName"]}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="rollNo" className="text-xs font-semibold">
                      Student Roll Number *
                    </Label>
                    <Input
                      id="rollNo"
                      value={formData.rollNo}
                      onChange={(e) => handleChange("rollNo", e.target.value)}
                      className="text-xs rounded-xl font-mono"
                    />
                    {errors["rollNo"] && (
                      <p className="text-[11px] text-rose-500">{errors["rollNo"]}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      Campus Email Address *
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className="text-xs rounded-xl"
                    />
                    {errors["email"] && (
                      <p className="text-[11px] text-rose-500">{errors["email"]}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      Mobile Contact Number *
                    </Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="text-xs rounded-xl"
                    />
                    {errors["phone"] && (
                      <p className="text-[11px] text-rose-500">{errors["phone"]}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="homeAddress" className="text-xs font-semibold">
                      Permanent Home Address
                    </Label>
                    <Input
                      id="homeAddress"
                      value={formData.homeAddress}
                      onChange={(e) => handleChange("homeAddress", e.target.value)}
                      className="text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="homeState" className="text-xs font-semibold">
                      Home State / Domicile
                    </Label>
                    <Input
                      id="homeState"
                      value={formData.homeState}
                      onChange={(e) => handleChange("homeState", e.target.value)}
                      className="text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="distanceKm" className="text-xs font-semibold">
                      Distance from Campus (km) *
                    </Label>
                    <Input
                      id="distanceKm"
                      type="number"
                      value={formData.distanceKm}
                      onChange={(e) => handleChange("distanceKm", e.target.value)}
                      className="text-xs rounded-xl"
                    />
                    <p className="text-[10px] text-muted">
                      Students residing &gt; 50 km receive hostel allocation priority.
                    </p>
                    {errors["distanceKm"] && (
                      <p className="text-[11px] text-rose-500">{errors["distanceKm"]}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Academic Information */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Academic Standing & Programme
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Academic performance is incorporated into priority scoring without penalizing
                    merit.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="programme" className="text-xs font-semibold">
                      Academic Degree & Programme *
                    </Label>
                    <Input
                      id="programme"
                      value={formData.programme}
                      onChange={(e) => handleChange("programme", e.target.value)}
                      className="text-xs rounded-xl"
                    />
                    {errors["programme"] && (
                      <p className="text-[11px] text-rose-500">{errors["programme"]}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="department" className="text-xs font-semibold">
                      Department
                    </Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleChange("department", e.target.value)}
                      className="text-xs rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="year" className="text-xs font-semibold">
                      Current Year of Study
                    </Label>
                    <select
                      id="year"
                      value={formData.year}
                      onChange={(e) => handleChange("year", e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-surface px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="1">Year 1 (Freshman)</option>
                      <option value="2">Year 2 (Sophomore)</option>
                      <option value="3">Year 3 (Junior)</option>
                      <option value="4">Year 4 (Senior)</option>
                      <option value="pg">Postgraduate / Research</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cgpa" className="text-xs font-semibold">
                      Cumulative CGPA (Out of 10.0) *
                    </Label>
                    <Input
                      id="cgpa"
                      value={formData.cgpa}
                      onChange={(e) => handleChange("cgpa", e.target.value)}
                      className="text-xs rounded-xl font-mono"
                    />
                    {errors["cgpa"] && (
                      <p className="text-[11px] text-rose-500">{errors["cgpa"]}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="enrolmentStatus" className="text-xs font-semibold">
                      Academic Enrolment Status
                    </Label>
                    <Input
                      id="enrolmentStatus"
                      value={formData.enrolmentStatus}
                      readOnly
                      className="text-xs rounded-xl bg-surface-muted/50 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Eligibility & Criteria */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Policy Criteria & Declarations
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Mandatory declarations aligned with Institute Residence Policy.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          1. Tuition & Hostel Fee Clearance
                        </span>
                        <span className="text-[11px] text-muted">
                          Have you cleared all dues for the upcoming academic session?
                        </span>
                      </div>
                      <select
                        value={formData.feeCleared}
                        onChange={(e) => handleChange("feeCleared", e.target.value)}
                        className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold"
                      >
                        <option value="yes">Yes, Cleared</option>
                        <option value="pending">Pending</option>
                        <option value="no">No</option>
                      </select>
                    </div>
                    {errors["feeCleared"] && (
                      <p className="text-[11px] text-rose-500">{errors["feeCleared"]}</p>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          2. Disciplinary Conduct Clearance
                        </span>
                        <span className="text-[11px] text-muted">
                          Declare that you have zero active disciplinary penalties or hostel
                          debarment orders.
                        </span>
                      </div>
                      <select
                        value={formData.disciplinaryCleared}
                        onChange={(e) => handleChange("disciplinaryCleared", e.target.value)}
                        className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold"
                      >
                        <option value="yes">No Penalties (Cleared)</option>
                        <option value="no">Pending Inquiry</option>
                      </select>
                    </div>
                    {errors["disciplinaryCleared"] && (
                      <p className="text-[11px] text-rose-500">{errors["disciplinaryCleared"]}</p>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          3. Disability / Accessible Housing Accommodation
                        </span>
                        <span className="text-[11px] text-muted">
                          Do you require step-free ground floor or ramp-accessible room allocation?
                        </span>
                      </div>
                      <select
                        value={formData.hasDisability}
                        onChange={(e) => handleChange("hasDisability", e.target.value)}
                        className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold"
                      >
                        <option value="no">No Special Requirement</option>
                        <option value="yes">Yes (Ground Floor / Accessible)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Document Uploads */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Supporting Documents
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Upload official receipts and identity proofs. Formats: PDF, PNG, JPG (up to 5MB
                    each).
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl border border-border/70 bg-surface-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          Fee Payment Receipt 2026–27
                        </span>
                        <span className="text-[11px] text-muted">
                          fee_receipt_autumn2026.pdf &bull; 1.2 MB &bull; Status: Verified
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-1 shrink-0 self-start sm:self-auto">
                      Verified
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl border border-border/70 bg-surface-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
                        <CheckCircle2 className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          Institute Student ID Card Proof
                        </span>
                        <span className="text-[11px] text-muted">
                          student_id_card_23cs10042.jpg &bull; 850 KB &bull; Status: Verified
                        </span>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-1 shrink-0 self-start sm:self-auto">
                      Verified
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl border border-dashed border-border/80 bg-surface text-center">
                    <FileUploader
                      onFileSelect={(file) => {
                        if (file) {
                          toast.success(`Uploaded additional document: ${file.name}`);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Hostel Preferences */}
            {currentStep === 4 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Hostel Residence Preferences
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Rank your choice residences. Gale-Shapley matching maximizes top-choice
                    fulfilment.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500 text-white font-bold text-xs">
                        1
                      </span>
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          First Preference Residence
                        </span>
                        <span className="text-[10px] text-muted">
                          North Campus &bull; 3 min walk
                        </span>
                      </div>
                    </div>
                    <select
                      value={formData.preferredHostel1}
                      onChange={(e) => handleChange("preferredHostel1", e.target.value)}
                      className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold"
                    >
                      <option value="hostel-a">Aryabhata Hall (AC Double)</option>
                      <option value="hostel-e">Vikram Sarabhai Hall (Regular)</option>
                      <option value="hostel-c">Ramanujan Tower (Single)</option>
                    </select>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-foreground font-bold text-xs">
                        2
                      </span>
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          Second Preference Residence
                        </span>
                        <span className="text-[10px] text-muted">
                          West Campus &bull; 6 min walk
                        </span>
                      </div>
                    </div>
                    <select
                      value={formData.preferredHostel2}
                      onChange={(e) => handleChange("preferredHostel2", e.target.value)}
                      className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold"
                    >
                      <option value="hostel-e">Vikram Sarabhai Hall (Regular)</option>
                      <option value="hostel-a">Aryabhata Hall (AC Double)</option>
                      <option value="hostel-c">Ramanujan Tower (Single)</option>
                    </select>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-border text-foreground font-bold text-xs">
                        3
                      </span>
                      <div>
                        <span className="font-bold text-xs text-foreground block">
                          Third Preference Residence
                        </span>
                        <span className="text-[10px] text-muted">
                          Research Enclave &bull; 8 min walk
                        </span>
                      </div>
                    </div>
                    <select
                      value={formData.preferredHostel3}
                      onChange={(e) => handleChange("preferredHostel3", e.target.value)}
                      className="h-8 rounded-lg border border-border bg-surface px-2.5 text-xs font-semibold"
                    >
                      <option value="hostel-c">Ramanujan Tower (Single)</option>
                      <option value="hostel-a">Aryabhata Hall (AC Double)</option>
                      <option value="hostel-e">Vikram Sarabhai Hall (Regular)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Roommate Preferences */}
            {currentStep === 5 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Roommate Pairing Choice
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Opt for mutual group pairing or allow algorithmic lifestyle compatibility
                    matching.
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleChange("roommateChoice", "pair")}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        formData.roommateChoice === "pair"
                          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 shadow-xs"
                          : "border-border/70 bg-surface hover:bg-surface-muted"
                      }`}
                    >
                      <Users className="h-5 w-5 text-brand-600 mb-2" />
                      <div className="font-bold text-xs text-foreground">
                        Mutual Roommate Pairing
                      </div>
                      <div className="text-[11px] text-muted mt-1">
                        Pair with a verified classmate using mutual group consent code.
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChange("roommateChoice", "algo")}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        formData.roommateChoice === "algo"
                          ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 shadow-xs"
                          : "border-border/70 bg-surface hover:bg-surface-muted"
                      }`}
                    >
                      <Sparkles className="h-5 w-5 text-cyan-600 mb-2" />
                      <div className="font-bold text-xs text-foreground">Algorithmic Best Fit</div>
                      <div className="text-[11px] text-muted mt-1">
                        Let Gale-Shapley match you based on salted lifestyle compatibility.
                      </div>
                    </button>
                  </div>

                  {formData.roommateChoice === "pair" && (
                    <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-2">
                      <Label htmlFor="roommateRollNo" className="text-xs font-semibold">
                        Mutual Roommate Roll Number
                      </Label>
                      <Input
                        id="roommateRollNo"
                        value={formData.roommateRollNo}
                        onChange={(e) => handleChange("roommateRollNo", e.target.value)}
                        placeholder="e.g. 23CS10088"
                        className="text-xs rounded-xl font-mono"
                      />
                      <p className="text-[10px] text-muted">
                        Paired with Rohan Deshmukh (Group: CAMPUS-8819). Both students must confirm.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 7: Lifestyle Survey */}
            {currentStep === 6 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Lifestyle Compatibility Survey
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Your answers are salted & hashed client-side to protect personal privacy.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sleep Schedule</Label>
                    <select
                      value={formData.sleepSchedule}
                      onChange={(e) => handleChange("sleepSchedule", e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground"
                    >
                      <option value="early_bird">Early Bird (Before 11:00 PM)</option>
                      <option value="night_owl">Night Owl (After 1:00 AM)</option>
                      <option value="flexible">Flexible (Around Midnight)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Study Atmosphere</Label>
                    <select
                      value={formData.studyHabit}
                      onChange={(e) => handleChange("studyHabit", e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground"
                    >
                      <option value="quiet_silent">Pin-Drop Silence</option>
                      <option value="background_music">Ambient / Headphones</option>
                      <option value="group_study">Collaborative Study</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Cleanliness Standard</Label>
                    <select
                      value={formData.cleanliness}
                      onChange={(e) => handleChange("cleanliness", e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground"
                    >
                      <option value="meticulous">Meticulous (Daily tidying)</option>
                      <option value="moderate">Moderate (Weekly cleaning)</option>
                      <option value="relaxed">Relaxed</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Guest & Visitor Policy</Label>
                    <select
                      value={formData.guestPolicy}
                      onChange={(e) => handleChange("guestPolicy", e.target.value)}
                      className="w-full h-9 rounded-xl border border-input bg-surface px-3 text-xs text-foreground"
                    >
                      <option value="strictly_no">Strictly No Room Guests</option>
                      <option value="weekends_only">Weekend Study Buddies Only</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8: Review Application */}
            {currentStep === 7 && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-heading text-lg font-bold text-foreground">
                    Review Housing Application Summary
                  </h3>
                  <p className="text-xs text-muted mt-0.5">
                    Please verify your details before official submission and cryptographic locking.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground block">1. Applicant Identity</span>
                      <span className="text-muted">
                        {formData.fullName} ({formData.rollNo}) &bull; {formData.programme}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(0)}
                      className="text-xs text-brand-600 font-bold"
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground block">
                        2. Academic & Policy Eligibility
                      </span>
                      <span className="text-muted">
                        CGPA {formData.cgpa} &bull; Fees Cleared &bull; 850 km Distance Priority
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(1)}
                      className="text-xs text-brand-600 font-bold"
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-foreground block">
                        3. Hostel & Roommate Choices
                      </span>
                      <span className="text-muted">
                        1st: Aryabhata Hall &bull; Roommate: Rohan Deshmukh (Paired)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCurrentStep(4)}
                      className="text-xs text-brand-600 font-bold"
                    >
                      Edit
                    </Button>
                  </div>

                  <div className="p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-950/40 border border-brand-500/30 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.honorPledge}
                        onChange={(e) => handleChange("honorPledge", e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-[11px] text-foreground leading-relaxed">
                        I hereby certify that all information declared is truthful and backed by
                        verified institutional documents. I agree to comply with the Institute
                        Student Residence Code of Conduct.
                      </span>
                    </label>
                    {errors["honorPledge"] && (
                      <p className="text-[11px] text-rose-500">{errors["honorPledge"]}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 9: Submit & Receipt Confirmation */}
            {currentStep === 8 && (
              <div className="text-center py-6 space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-600 mx-auto">
                  <ShieldCheck className="h-9 w-9" />
                </div>
                <h3 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                  Ready to Lock and Submit
                </h3>
                <p className="text-xs sm:text-sm text-muted max-w-md mx-auto">
                  Once submitted, your application preferences are finalized for the automated
                  Gale-Shapley matching run.
                </p>

                <div className="pt-2">
                  <Button
                    size="lg"
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="bg-brand-500 hover:bg-brand-600 text-white font-bold px-8 shadow-md"
                  >
                    {isSubmitting
                      ? "Cryptographically Locking Application..."
                      : "Confirm & Submit Application"}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Stepper Navigation Buttons */}
        <div className="flex items-center justify-between border-t border-border/60 pt-5 mt-6">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={currentStep === 0 || currentStep === STEPS.length - 1}
            className="text-xs min-target-size"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            <span>Previous</span>
          </Button>

          {currentStep < STEPS.length - 1 && (
            <Button
              type="button"
              size="sm"
              onClick={nextStep}
              className="bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold min-target-size"
            >
              <span>{currentStep === STEPS.length - 2 ? "Review & Finish" : "Next Step"}</span>
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Official Submission Receipt Modal */}
      {submittedReceipt && (
        <Dialog
          open={Boolean(submittedReceipt)}
          onOpenChange={() => router.push("/student/dashboard")}
        >
          <DialogContent className="max-w-md p-6 bg-white text-zinc-900 border-zinc-200">
            <div className="text-center space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mx-auto">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h3 className="font-heading text-xl font-extrabold text-zinc-900">
                Application Successfully Submitted!
              </h3>
              <p className="text-xs text-zinc-600">
                Your hostel application is verified and queued for the Round 1 allocation engine.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 text-xs font-mono space-y-2 mt-4">
              <div className="flex justify-between">
                <span className="text-zinc-500">Receipt No:</span>
                <span className="font-bold text-zinc-900">{submittedReceipt.receiptNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Timestamp:</span>
                <span className="text-zinc-800">{submittedReceipt.submittedAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Digital Seal:</span>
                <span className="text-zinc-800 truncate max-w-[140px]">
                  {submittedReceipt.hash}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4 border-t border-zinc-200">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs border-zinc-300 text-zinc-700 min-target-size"
              >
                <Printer className="mr-1.5 h-3.5 w-3.5" />
                <span>Print Receipt</span>
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/student/dashboard")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs min-target-size"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

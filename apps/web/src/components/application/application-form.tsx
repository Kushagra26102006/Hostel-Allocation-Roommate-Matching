"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, Upload, FileText, CheckCircle2, ShieldCheck, Loader2, Sparkles } from "lucide-react";
import { Stepper } from "@/components/stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const profileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  pincode: z.string().length(6, "PIN Code must be 6 digits"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  address: z.string().min(5, "Address is required"),
});

const preferencesSchema = z.object({
  roomType: z.enum(["single", "double", "triple"]),
  acPreference: z.enum(["ac", "non_ac"]),
  floorPreference: z.string(),
});

const questionnaireSchema = z.object({
  priorityTier: z.enum(["pwd", "single_parent", "merit", "general"]),
  dietaryPreference: z.enum(["veg", "non_veg", "vegan"]),
  studyHabits: z.enum(["early_bird", "night_owl"]),
});

const applicationFormSchema = z.object({
  profile: profileSchema,
  preferences: preferencesSchema,
  questionnaire: questionnaireSchema,
});

export type ApplicationFormData = z.infer<typeof applicationFormSchema>;

interface ApplicationFormProps {
  cycleId: string;
  initialApplication?: {
    id: string;
    reference_number: string;
    status: string;
    version: number;
    form_data?: Partial<ApplicationFormData>;
  } | null;
}

const STEPS = ["Profile", "Documents", "Preferences", "Questionnaire", "Review & Submit"];

export function ApplicationForm({ cycleId, initialApplication }: ApplicationFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [applicationId, setApplicationId] = useState<string | null>(initialApplication?.id ?? null);
  const [referenceNumber, setReferenceNumber] = useState<string | null>(initialApplication?.reference_number ?? null);
  const [version, setVersion] = useState<number>(initialApplication?.version ?? 1);
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<{
    reference_number: string;
    submitted_at: string;
  } | null>(initialApplication?.status === "submitted" ? {
    reference_number: initialApplication.reference_number,
    submitted_at: new Date().toISOString(),
  } : null);

  const [documentFiles, setDocumentFiles] = useState<Record<string, {
    name: string;
    status: "uploading" | "clean" | "error";
    progress: number;
    docId?: string;
  }>>({});

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [shakeStep, setShakeStep] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors, touchedFields },
  } = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    mode: "onTouched",
    defaultValues: {
      profile: {
        fullName: initialApplication?.form_data?.profile?.fullName ?? "",
        email: initialApplication?.form_data?.profile?.email ?? "",
        phone: initialApplication?.form_data?.profile?.phone ?? "",
        pincode: initialApplication?.form_data?.profile?.pincode ?? "",
        city: initialApplication?.form_data?.profile?.city ?? "",
        state: initialApplication?.form_data?.profile?.state ?? "",
        address: initialApplication?.form_data?.profile?.address ?? "",
      },
      preferences: {
        roomType: initialApplication?.form_data?.preferences?.roomType ?? "double",
        acPreference: initialApplication?.form_data?.preferences?.acPreference ?? "non_ac",
        floorPreference: initialApplication?.form_data?.preferences?.floorPreference ?? "ground",
      },
      questionnaire: {
        priorityTier: initialApplication?.form_data?.questionnaire?.priorityTier ?? "general",
        dietaryPreference: initialApplication?.form_data?.questionnaire?.dietaryPreference ?? "veg",
        studyHabits: initialApplication?.form_data?.questionnaire?.studyHabits ?? "early_bird",
      },
    },
  });

  const formValues = watch();

  // Create initial draft if none exists
  useEffect(() => {
    if (!applicationId && cycleId) {
      void fetch("/api/v1/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cycle_id: cycleId }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data._id) {
            setApplicationId(data._id);
            setReferenceNumber(data.reference_number);
            setVersion(data.version ?? 1);
          }
        })
        .catch(() => {});
    }
  }, [cycleId, applicationId]);

  // PIN code auto-fill trigger
  const pincodeVal = watch("profile.pincode");
  useEffect(() => {
    if (pincodeVal && pincodeVal.length === 6) {
      setPincodeLoading(true);
      fetch(`/api/v1/location/pincode/${pincodeVal}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.city) setValue("profile.city", data.city, { shouldValidate: true });
          if (data.state) setValue("profile.state", data.state, { shouldValidate: true });
        })
        .catch(() => {})
        .finally(() => setPincodeLoading(false));
    }
  }, [pincodeVal, setValue]);

  // Debounced Autosave
  const autosave = useCallback(
    async (data: ApplicationFormData) => {
      if (!applicationId) return;
      setAutosaveStatus("saving");
      try {
        const res = await fetch(`/api/v1/applications/${applicationId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "If-Match": `"${version}"`,
          },
          body: JSON.stringify({
            version,
            form_data: data,
          }),
        });

        if (res.status === 412) {
          setAutosaveStatus("error");
          // Re-fetch application to sync version
          const appRes = await fetch(`/api/v1/applications/${applicationId}`);
          const appData = await appRes.json();
          if (appData.version) setVersion(appData.version);
          return;
        }

        if (res.ok) {
          const updated = await res.json();
          if (updated.version) setVersion(updated.version);
          setAutosaveStatus("saved");
          setTimeout(() => setAutosaveStatus("idle"), 2000);
        }
      } catch {
        setAutosaveStatus("error");
      }
    },
    [applicationId, version],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (applicationId) {
        void autosave(formValues);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [formValues, autosave, applicationId]);

  // File Upload handler with presigned URL and Magic Byte check
  const handleFileUpload = async (type: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    setDocumentFiles((prev) => ({
      ...prev,
      [type]: { name: file.name, status: "uploading", progress: 20 },
    }));

    try {
      // 1. Get presigned PUT URL
      const presignRes = await fetch("/api/v1/documents/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mime_type: file.type || "application/pdf",
          size_bytes: file.size,
        }),
      });
      const presignData = await presignRes.json();

      setDocumentFiles((prev) => ({
        ...prev,
        [type]: { ...prev[type]!, progress: 50 },
      }));

      // 2. Read arrayBuffer sample for magic byte validation
      const buffer = await file.arrayBuffer();
      const base64Sample = Buffer.from(buffer).toString("base64");

      // 3. Verify upload & malware scan
      const verifyRes = await fetch("/api/v1/documents/verify-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          application_id: applicationId,
          type,
          storage_key: presignData.storage_key,
          original_name: file.name,
          mime_type: file.type || "application/pdf",
          size_bytes: file.size,
          file_base64: base64Sample,
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json();
        alert(err.detail || "Server-side file validation failed (magic-byte check failed).");
        setDocumentFiles((prev) => ({
          ...prev,
          [type]: { name: file.name, status: "error", progress: 0 },
        }));
        return;
      }

      const docData = await verifyRes.json();

      setDocumentFiles((prev) => ({
        ...prev,
        [type]: { name: file.name, status: "clean", progress: 100, docId: docData._id },
      }));
    } catch {
      setDocumentFiles((prev) => ({
        ...prev,
        [type]: { name: file.name, status: "error", progress: 0 },
      }));
    }
  };

  // Final Submit
  const onSubmit = async () => {
    if (!applicationId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/applications/${applicationId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Submission failed");
        setShakeStep(true);
        setTimeout(() => setShakeStep(false), 600);
        return;
      }

      setSubmissionReceipt({
        reference_number: data.reference_number,
        submitted_at: new Date(data.submitted_at).toLocaleString(),
      });
    } catch {
      alert("Submission failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    // Validate current step before advancing
    if (currentStep === 0) {
      const profileResult = profileSchema.safeParse(formValues.profile);
      if (!profileResult.success) {
        setShakeStep(true);
        setTimeout(() => setShakeStep(false), 600);
        return;
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  if (submissionReceipt) {
    return (
      <Card className="max-w-2xl mx-auto border-emerald-500/30 bg-emerald-950/10 dark:bg-emerald-950/20 backdrop-blur-md shadow-2xl">
        <CardHeader className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-16 h-16 bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <CardTitle className="text-2xl font-bold text-emerald-400">Application Submitted!</CardTitle>
          <CardDescription>Your application has been received and logged in the system.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 rounded-lg bg-surface/50 border border-emerald-500/20 space-y-3 font-mono text-sm">
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted">Reference Number:</span>
              <span className="font-bold text-emerald-400">{submissionReceipt.reference_number}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-2">
              <span className="text-muted">Submitted At:</span>
              <span>{submissionReceipt.submitted_at}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Status:</span>
              <span className="px-2 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-300 font-sans font-semibold">
                SUBMITTED
              </span>
            </div>
          </div>
          <p className="text-xs text-center text-muted">
            Keep note of your reference number to track your allocation status.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header & Autosave Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Hostel Seat Application</h1>
          {referenceNumber && (
            <p className="text-xs font-mono text-muted">Ref: {referenceNumber}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {autosaveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
            </span>
          )}
          {autosaveStatus === "saved" && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full"
            >
              <Check className="w-3 h-3" /> Saved
            </motion.span>
          )}
          {autosaveStatus === "error" && (
            <span className="text-xs text-rose-400">Autosave conflict</span>
          )}
        </div>
      </div>

      {/* Stepper Navigation */}
      <Stepper steps={STEPS} currentStep={currentStep} />

      {/* Form Content Step */}
      <motion.div
        animate={shakeStep ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="border-border/60 bg-surface/80 backdrop-blur-md shadow-xl">
          <CardContent className="pt-6 space-y-6">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <motion.div
                  key="step-0"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-text border-b border-border/40 pb-2">
                    Step 1: Student Profile Information
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fullName">Full Name</Label>
                      <div className="relative">
                        <Input id="fullName" {...register("profile.fullName")} placeholder="John Doe" />
                        {touchedFields.profile?.fullName && !errors.profile?.fullName && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-3" />
                        )}
                      </div>
                      {errors.profile?.fullName && (
                        <p className="text-xs text-rose-400 mt-1">{errors.profile.fullName.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" {...register("profile.email")} placeholder="john@campus.edu" />
                      {errors.profile?.email && (
                        <p className="text-xs text-rose-400 mt-1">{errors.profile.email.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" {...register("profile.phone")} placeholder="+91 9876543210" />
                      {errors.profile?.phone && (
                        <p className="text-xs text-rose-400 mt-1">{errors.profile.phone.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="pincode">PIN Code (Auto-fill city & state)</Label>
                      <div className="relative">
                        <Input id="pincode" {...register("profile.pincode")} maxLength={6} placeholder="110001" />
                        {pincodeLoading && (
                          <Loader2 className="w-4 h-4 text-brand-400 animate-spin absolute right-3 top-3" />
                        )}
                      </div>
                      {errors.profile?.pincode && (
                        <p className="text-xs text-rose-400 mt-1">{errors.profile.pincode.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input id="city" {...register("profile.city")} placeholder="New Delhi" />
                      {errors.profile?.city && (
                        <p className="text-xs text-rose-400 mt-1">{errors.profile.city.message}</p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input id="state" {...register("profile.state")} placeholder="Delhi" />
                      {errors.profile?.state && (
                        <p className="text-xs text-rose-400 mt-1">{errors.profile.state.message}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Permanent Address</Label>
                    <Input id="address" {...register("profile.address")} placeholder="House No, Street, Landmark" />
                    {errors.profile?.address && (
                      <p className="text-xs text-rose-400 mt-1">{errors.profile.address.message}</p>
                    )}
                  </div>
                </motion.div>
              )}

              {currentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <h2 className="text-lg font-semibold text-text border-b border-border/40 pb-2">
                    Step 2: Document Uploads (.pdf, .png, .jpg — Max 5MB)
                  </h2>

                  {["id_proof", "income_certificate", "caste_certificate"].map((docType) => {
                    const docInfo = documentFiles[docType];
                    return (
                      <div key={docType} className="p-4 rounded-xl border border-border/60 bg-surface/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="w-8 h-8 text-brand-400" />
                          <div>
                            <p className="font-semibold capitalize text-sm">{docType.replace("_", " ")}</p>
                            <p className="text-xs text-muted">PDF or Image up to 5MB</p>
                            {docInfo && (
                              <p className="text-xs text-emerald-400 flex items-center gap-1 mt-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Scan Clean: {docInfo.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          <input
                            type="file"
                            id={`file-${docType}`}
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleFileUpload(docType, file);
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById(`file-${docType}`)?.click()}
                          >
                            <Upload className="w-4 h-4 mr-2" /> Upload
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-text border-b border-border/40 pb-2">
                    Step 3: Room Preferences
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <Label>Room Capacity Preference</Label>
                      <Controller
                        name="preferences.roomType"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select room type" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Single Seater</SelectItem>
                              <SelectItem value="double">Double Seater</SelectItem>
                              <SelectItem value="triple">Triple Seater</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div>
                      <Label>Air Conditioning</Label>
                      <Controller
                        name="preferences.acPreference"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select AC preference" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ac">Air Conditioned (AC)</SelectItem>
                              <SelectItem value="non_ac">Non-AC</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-text border-b border-border/40 pb-2">
                    Step 4: Questionnaire & Priority Tier
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <Label>Priority Allocation Bucket</Label>
                      <Controller
                        name="questionnaire.priorityTier"
                        control={control}
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger><SelectValue placeholder="Select priority tier" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General Bucket</SelectItem>
                              <SelectItem value="merit">Merit Scholar</SelectItem>
                              <SelectItem value="pwd">Persons with Disabilities (PwD)</SelectItem>
                              <SelectItem value="single_parent">Single Parent Child</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <h2 className="text-lg font-semibold text-text border-b border-border/40 pb-2">
                    Step 5: Review & Submit Application
                  </h2>

                  <div className="p-4 rounded-lg bg-surface/50 border border-border/40 space-y-3 text-sm">
                    <p><span className="font-semibold">Student Name:</span> {formValues.profile.fullName}</p>
                    <p><span className="font-semibold">Email:</span> {formValues.profile.email}</p>
                    <p><span className="font-semibold">Address:</span> {formValues.profile.address}, {formValues.profile.city}, {formValues.profile.state} - {formValues.profile.pincode}</p>
                    <p><span className="font-semibold">Priority Tier:</span> <span className="uppercase text-brand-400 font-bold">{formValues.questionnaire.priorityTier}</span></p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Stepper Footer Controls */}
            <div className="flex justify-between pt-6 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 0}
              >
                Back
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={nextStep}>
                  Continue
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={onSubmit}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" /> Confirm & Submit Application
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

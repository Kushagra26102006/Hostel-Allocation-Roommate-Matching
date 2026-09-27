"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocaleStore } from "@/stores/locale-store";
import { useTheme } from "next-themes";
import { User, Globe, Sun, LogOut, Save, BookOpen, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { signOut, useSession } from "next-auth/react";
import { useCurrentStudent, useUpdateStudentProfile } from "@/hooks/use-current-student";

export default function StudentProfilePage() {
  const { locale, setLocale } = useLocaleStore();
  const { theme, setTheme } = useTheme();
  const { data: session } = useSession();

  const { data: student, isLoading: isStudentLoading } = useCurrentStudent();
  const updateProfileMutation = useUpdateStudentProfile();

  const [profile, setProfile] = React.useState({
    fullName: "",
    rollNo: "",
    email: "",
    phone: "",
    programme: "",
    department: "",
    year: "1",
    semester: "Semester 1",
    cgpa: "",
    homeState: "",
    permanentAddress: "",
    emergencyContact: "",
  });

  // Sync state whenever student data loads from database or session
  React.useEffect(() => {
    if (student) {
      setProfile({
        fullName: student.fullName || student.name || session?.user?.name || "",
        rollNo: student.rollNumber || student.roll_number || session?.user?.rollNumber || "",
        email: student.email || session?.user?.email || "",
        phone: student.phone || session?.user?.phone || "",
        programme: student.programme || "B.Tech Computer Science & Engineering",
        department: student.department || "Computer Science & Engineering",
        year: String(student.year || 1),
        semester: student.semester || "Semester 1",
        cgpa: student.cgpa || "",
        homeState: student.homeState || "",
        permanentAddress: student.address || "",
        emergencyContact: student.emergencyContact || "",
      });
    } else if (session?.user) {
      setProfile((prev) => ({
        ...prev,
        fullName: prev.fullName || session.user.name || "",
        email: prev.email || session.user.email || "",
        rollNo: prev.rollNo || session.user.rollNumber || "",
        phone: prev.phone || session.user.phone || "",
      }));
    }
  }, [student, session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync({
        fullName: profile.fullName.trim(),
        name: profile.fullName.trim(),
        rollNumber: profile.rollNo.trim(),
        phone: profile.phone.trim(),
        programme: profile.programme.trim(),
        department: profile.department.trim(),
        year: Number(profile.year) || 1,
        semester: profile.semester.trim(),
        address: profile.permanentAddress.trim(),
        emergencyContact: profile.emergencyContact.trim(),
        homeState: profile.homeState.trim(),
      });
      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error((err as Error).message || "Failed to update profile");
    }
  };

  const displayName = profile.fullName || session?.user?.name || "Student Resident";
  const displayEmail = profile.email || session?.user?.email || "student@campus.edu";
  const displayRoll = profile.rollNo || session?.user?.rollNumber || "Pending Allotment";
  const initials =
    displayName
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "SR";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
            <User className="h-3.5 w-3.5" />
            <span>Verified Student Resident Record</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Student Profile & Academic Record
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted">
            Institutional student identity, verified contact coordinates, and housing eligibility
            profile.
          </p>
        </div>

        <Button
          onClick={() => signOut({ callbackUrl: "/login" })}
          variant="outline"
          size="sm"
          className="text-xs text-rose-500 hover:text-rose-600 border-border/80 self-start sm:self-auto min-target-size"
        >
          <LogOut className="mr-1.5 h-3.5 w-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      {/* Verified Resident Identity Hero Card */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white font-heading font-extrabold text-2xl shadow-md">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading text-xl font-bold text-foreground">{displayName}</h2>
                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                  Verified Resident
                </span>
              </div>
              <p className="font-mono text-xs text-muted mt-0.5">
                Roll No: {displayRoll} &bull;{" "}
                {profile.department || "Computer Science & Engineering"}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Current Allotment:{" "}
                <strong className="text-foreground">
                  {student?.hasAllocation
                    ? "Aryabhata Hall, Room A-204 (Bed 1)"
                    : "Residential Allocation Pending (Cycle 1)"}
                </strong>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface-muted/50 p-3.5 px-4 text-left sm:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-muted block">
              Profile Completion
            </span>
            <span className="font-heading text-xl font-bold text-brand-600 dark:text-brand-400 block">
              {student?.profileCompletion ?? 60}%
            </span>
            <span className="text-[11px] text-muted">Active Institutional Account</span>
          </div>
        </div>
      </div>

      {/* Academic Information Details */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <BookOpen className="h-4.5 w-4.5 text-brand-600" />
          <h3 className="font-heading text-base font-bold text-foreground">
            Academic Degree & Standing
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted block">
              Degree Programme
            </span>
            <span className="font-bold text-foreground mt-0.5 block">
              {profile.programme || "B.Tech Computer Science & Engineering"}
            </span>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted block">Academic Year</span>
            <span className="font-bold text-foreground mt-0.5 block">Year {profile.year}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted block">Current Term</span>
            <span className="font-bold text-foreground mt-0.5 block">
              {profile.semester || "Semester 1"}
            </span>
          </div>
        </div>
      </div>

      {/* Editable Contact & Profile Information Form */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h3 className="font-heading text-base font-bold text-foreground">
            Student Profile Details
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Keep your active phone, residential address, and emergency contacts updated for housing
            records.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="profFullName" className="text-xs font-semibold">
                Full Name *
              </Label>
              <Input
                id="profFullName"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                required
                className="text-xs rounded-xl"
                placeholder="Enter full name"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profRollNo" className="text-xs font-semibold">
                Student Roll Number *
              </Label>
              <Input
                id="profRollNo"
                value={profile.rollNo}
                onChange={(e) => setProfile({ ...profile, rollNo: e.target.value })}
                required
                className="text-xs rounded-xl font-mono"
                placeholder="e.g. TEST001 or 23CS10042"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">University Email</Label>
              <Input
                value={displayEmail}
                readOnly
                className="text-xs rounded-xl bg-surface-muted/50 cursor-not-allowed font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profPhone" className="text-xs font-semibold">
                Phone *
              </Label>
              <Input
                id="profPhone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="text-xs rounded-xl"
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profProgramme" className="text-xs font-semibold">
                Programme
              </Label>
              <Input
                id="profProgramme"
                value={profile.programme}
                onChange={(e) => setProfile({ ...profile, programme: e.target.value })}
                className="text-xs rounded-xl"
                placeholder="e.g. B.Tech Computer Science"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profYear" className="text-xs font-semibold">
                Academic Year
              </Label>
              <select
                id="profYear"
                value={profile.year}
                onChange={(e) => setProfile({ ...profile, year: e.target.value })}
                className="w-full rounded-xl border border-input bg-surface px-3 py-2 text-xs text-foreground focus:border-brand-500 focus:outline-none"
              >
                <option value="1">Year 1 (Freshman)</option>
                <option value="2">Year 2 (Sophomore)</option>
                <option value="3">Year 3 (Junior)</option>
                <option value="4">Year 4 (Senior)</option>
              </select>
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="profAddress" className="text-xs font-semibold">
                Address
              </Label>
              <Input
                id="profAddress"
                value={profile.permanentAddress}
                onChange={(e) => setProfile({ ...profile, permanentAddress: e.target.value })}
                className="text-xs rounded-xl"
                placeholder="Enter permanent residential address"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="emergencyContact" className="text-xs font-semibold">
                Emergency Parent / Guardian Contact
              </Label>
              <Input
                id="emergencyContact"
                value={profile.emergencyContact}
                onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                className="text-xs rounded-xl"
                placeholder="Parent/Guardian Name & Phone Number"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border/60">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending || isStudentLoading}
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs min-target-size"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* System Settings & Language Switcher Strip */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h3 className="font-heading text-base font-bold text-foreground">
            Portal Interface & Preferences
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Configure system language, color themes, and accessibility settings.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Language Selector */}
          <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-brand-600" />
              <span className="font-bold text-foreground">Interface Language</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setLocale("en")}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all min-target-size ${
                  locale === "en"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLocale("hi")}
                className={`py-2 px-1 rounded-xl text-xs font-bold font-devanagari transition-all min-target-size ${
                  locale === "hi"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                हिन्दी
              </button>
              <button
                type="button"
                onClick={() => setLocale("pa")}
                className={`py-2 px-1 rounded-xl text-xs font-bold font-gurmukhi transition-all min-target-size ${
                  locale === "pa"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                ਪੰਜਾਬੀ
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-brand-600" />
              <span className="font-bold text-foreground">Color Theme</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all min-target-size ${
                  theme === "light"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                Light
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all min-target-size ${
                  theme === "dark"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme("system")}
                className={`py-2 px-1 rounded-xl text-xs font-bold transition-all min-target-size ${
                  theme === "system"
                    ? "bg-brand-500 text-white shadow-xs"
                    : "bg-surface border border-border text-muted hover:text-foreground"
                }`}
              >
                System
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

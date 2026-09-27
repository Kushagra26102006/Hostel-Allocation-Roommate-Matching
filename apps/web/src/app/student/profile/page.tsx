"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocaleStore } from "@/stores/locale-store";
import { useTheme } from "next-themes";
import { User, Globe, Sun, LogOut, Save, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { signOut } from "next-auth/react";

export default function StudentProfilePage() {
  const { locale, setLocale } = useLocaleStore();
  const { theme, setTheme } = useTheme();

  const [profile, setProfile] = React.useState({
    fullName: "Aarav Sharma",
    rollNo: "23CS10042",
    email: "aarav.sharma@campus.edu",
    phone: "+91 98765 43210",
    programme: "B.Tech Computer Science & Engineering",
    department: "Computer Science & Engineering",
    year: "Year 3 (Junior)",
    semester: "Semester 5",
    cgpa: "9.35",
    homeState: "Maharashtra",
    permanentAddress: "Flat 402, Sea View Enclave, Worli, Mumbai, MH - 400018",
    emergencyContact: "Mr. Rajesh Sharma (Father) &bull; +91 98765 00000",
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile contact information updated successfully!");
  };

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
              AS
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-heading text-xl font-bold text-foreground">
                  {profile.fullName}
                </h2>
                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5">
                  Verified Resident
                </span>
              </div>
              <p className="font-mono text-xs text-muted mt-0.5">
                Roll No: {profile.rollNo} &bull; {profile.department}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Current Allotment:{" "}
                <strong className="text-foreground">Aryabhata Hall, Room A-204 (Bed 1)</strong>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-surface-muted/50 p-3.5 px-4 text-left sm:text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-muted block">Academic Merit</span>
            <span className="font-heading text-xl font-bold text-brand-600 dark:text-brand-400 block">
              CGPA {profile.cgpa}
            </span>
            <span className="text-[11px] text-muted">General Merited Tier 1</span>
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
            <span className="font-bold text-foreground mt-0.5 block">{profile.programme}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted block">Academic Year</span>
            <span className="font-bold text-foreground mt-0.5 block">{profile.year}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <span className="text-[10px] uppercase font-bold text-muted block">Current Term</span>
            <span className="font-bold text-foreground mt-0.5 block">{profile.semester}</span>
          </div>
        </div>
      </div>

      {/* Editable Contact Information Form */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-5">
        <div className="border-b border-border/60 pb-3">
          <h3 className="font-heading text-base font-bold text-foreground">
            Contact & Residential Coordinates
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Keep your active phone and emergency contacts updated for warden notices.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Institutional Email</Label>
              <Input
                value={profile.email}
                readOnly
                className="text-xs rounded-xl bg-surface-muted/50 cursor-not-allowed font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="profPhone" className="text-xs font-semibold">
                Mobile Phone Number *
              </Label>
              <Input
                id="profPhone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="profAddress" className="text-xs font-semibold">
                Permanent Residence Address
              </Label>
              <Input
                id="profAddress"
                value={profile.permanentAddress}
                onChange={(e) => setProfile({ ...profile, permanentAddress: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="emergencyContact" className="text-xs font-semibold">
                Emergency Parent / Guardian Contact *
              </Label>
              <Input
                id="emergencyContact"
                value={profile.emergencyContact}
                onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border/60">
            <Button
              type="submit"
              className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs min-target-size"
            >
              <Save className="mr-1.5 h-3.5 w-3.5" />
              <span>Save Contact Updates</span>
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

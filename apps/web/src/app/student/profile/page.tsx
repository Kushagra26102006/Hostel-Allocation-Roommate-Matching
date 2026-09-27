"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FadeIn, FadeUp } from "@/components/ui/motion-primitives";
import { Save, User, Lock, Key, ShieldCheck, History } from "lucide-react";
import { toast } from "sonner";

export default function StudentProfilePage() {
  const [activeTab, setActiveTab] = React.useState<
    "overview" | "security" | "privacy" | "activity"
  >("overview");

  const [profile, setProfile] = React.useState({
    name: "Aarav Sharma",
    rollNo: "23CS10042",
    email: "aarav.sharma@campus.edu",
    phone: "+91 98765 43210",
    programme: "B.Tech Computer Science & Engineering",
    year: "Year 3",
    homeState: "Maharashtra",
    emergencyContact: "+91 98765 00000 (Parent)",
  });

  const [privacyConsent, setPrivacyConsent] = React.useState(true);
  const [roommateMatchingOptIn, setRoommateMatchingOptIn] = React.useState(true);
  const [mfaEnabled, setMfaEnabled] = React.useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Profile and preferences updated successfully");
  };

  return (
    <FadeIn className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8">
      {/* Header */}
      <FadeUp>
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
          <User className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" />
          <span>Resident Identity Management</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl text-foreground">
          Student Profile & Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Manage your verified institutional identity, security credentials, mutual privacy consent,
          and ledger activity.
        </p>
      </FadeUp>

      {/* Tabs Switcher */}
      <FadeUp
        delay={0.05}
        className="flex items-center gap-1.5 rounded-xl bg-surface-muted/60 p-1 border border-border/60 overflow-x-auto"
      >
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
            activeTab === "overview"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <User className="h-3.5 w-3.5" />
          <span>Identity & Personal</span>
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
            activeTab === "security"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Lock className="h-3.5 w-3.5" />
          <span>Security & 2FA</span>
        </button>
        <button
          onClick={() => setActiveTab("privacy")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
            activeTab === "privacy"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Consent & Privacy</span>
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
            activeTab === "activity"
              ? "bg-brand-500 text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Activity Audit</span>
        </button>
      </FadeUp>

      {/* Tab 1: Personal Details */}
      {activeTab === "overview" && (
        <FadeUp delay={0.08}>
          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-center gap-4 pb-6 border-b border-border/60">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300 font-heading text-2xl font-bold border border-brand-200/60 dark:border-brand-800/60">
                AS
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading text-lg font-bold text-foreground">{profile.name}</h2>
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                    Verified Resident
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {profile.rollNo} • {profile.programme}
                </p>
              </div>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-bold text-foreground">
                    Full Name (University Records)
                  </Label>
                  <Input
                    value={profile.name}
                    disabled
                    className="mt-1.5 bg-surface-muted text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-foreground">
                    Roll Number / Student ID
                  </Label>
                  <Input
                    value={profile.rollNo}
                    disabled
                    className="mt-1.5 bg-surface-muted font-mono text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-bold text-foreground">University Email</Label>
                  <Input
                    value={profile.email}
                    disabled
                    className="mt-1.5 bg-surface-muted text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-foreground">Primary Mobile Number</Label>
                  <Input
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="mt-1.5 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-bold text-foreground">Academic Programme</Label>
                  <Input
                    value={`${profile.programme} (${profile.year})`}
                    disabled
                    className="mt-1.5 bg-surface-muted text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold text-foreground">
                    Emergency Contact (Guardian/Parent)
                  </Label>
                  <Input
                    value={profile.emergencyContact}
                    onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
                    className="mt-1.5 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border/60">
                <Button
                  type="submit"
                  className="rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile Changes
                </Button>
              </div>
            </form>
          </GlassCard>
        </FadeUp>
      )}

      {/* Tab 2: Security & 2FA */}
      {activeTab === "security" && (
        <FadeUp delay={0.08}>
          <GlassCard className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Authentication & Cryptographic Access
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Protect your student housing account with institutional multi-factor verification.
              </p>
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface-muted/30 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-heading text-sm font-bold text-foreground">
                    Two-Factor Authentication (TOTP)
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Required for signing allocation acceptances and roommate pairings
                  </div>
                </div>
              </div>
              <Switch checked={mfaEnabled} onCheckedChange={setMfaEnabled} />
            </div>

            <div className="rounded-2xl border border-border/80 bg-surface-muted/30 p-4 space-y-3">
              <div className="font-heading text-sm font-bold text-foreground">
                Active Browser Sessions
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div>MacBook Pro • Chrome 124 • Current Session</div>
                <span className="text-emerald-600 font-semibold">Active Now</span>
              </div>
            </div>
          </GlassCard>
        </FadeUp>
      )}

      {/* Tab 3: Consent & Privacy */}
      {activeTab === "privacy" && (
        <FadeUp delay={0.08}>
          <GlassCard className="p-6 sm:p-8 space-y-6">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Questionnaire Privacy & Mutual Consent
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                HostelHub encrypts your lifestyle questionnaire answers with SHA-256. Raw answers
                are never visible to peers.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-surface-muted/30 p-4">
                <div>
                  <div className="font-heading text-sm font-bold text-foreground">
                    Mutual Consent Roommate Discovery
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Allow students with compatible lifestyles to discover your invite code
                  </div>
                </div>
                <Switch
                  checked={roommateMatchingOptIn}
                  onCheckedChange={setRoommateMatchingOptIn}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-border/80 bg-surface-muted/30 p-4">
                <div>
                  <div className="font-heading text-sm font-bold text-foreground">
                    Anonymized Research Analytics Participation
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Contribute anonymous compatibility scores to improve university housing
                    algorithms
                  </div>
                </div>
                <Switch checked={privacyConsent} onCheckedChange={setPrivacyConsent} />
              </div>
            </div>
          </GlassCard>
        </FadeUp>
      )}

      {/* Tab 4: Activity Audit */}
      {activeTab === "activity" && (
        <FadeUp delay={0.08}>
          <GlassCard className="p-6 sm:p-8 space-y-4">
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Student Action Ledger
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Immutable record of applications, preference ranks, and consents committed by your
                account.
              </p>
            </div>

            <div className="space-y-2.5 text-xs font-mono">
              {[
                {
                  action: "Allocation Letter Downloaded",
                  date: "2026-09-24 16:10 UTC",
                  hash: "0x3a4b...91f0",
                },
                {
                  action: "Roommate Invitation Accepted (Rohan Deshmukh)",
                  date: "2026-09-22 11:42 UTC",
                  hash: "0x1c8e...62da",
                },
                {
                  action: "Preferences Ranked (Aryabhata #1, Gargi #2)",
                  date: "2026-09-20 09:15 UTC",
                  hash: "0x8f2d...55c1",
                },
                {
                  action: "Application Draft Submitted",
                  date: "2026-09-18 14:02 UTC",
                  hash: "0x992a...00ef",
                },
              ].map((act, i) => (
                <div
                  key={i}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl bg-surface-muted/40 p-3 border border-border/60"
                >
                  <div className="text-foreground font-semibold">{act.action}</div>
                  <div className="flex items-center gap-3 text-muted-foreground text-[11px] mt-1 sm:mt-0">
                    <span>{act.date}</span>
                    <span className="font-bold text-brand-600 dark:text-brand-400">{act.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </FadeUp>
      )}
    </FadeIn>
  );
}

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useLocaleStore } from "@/stores/locale-store";
import { useTheme } from "next-themes";
import { Settings, Globe, Sun, Moon, Eye, Lock, Save, Check, Laptop } from "lucide-react";
import { toast } from "sonner";

export default function StudentSettingsPage() {
  const { locale, setLocale } = useLocaleStore();
  const { theme, setTheme } = useTheme();

  const [reduceMotion, setReduceMotion] = React.useState(false);
  const [highContrast, setHighContrast] = React.useState(false);

  const handleSave = () => {
    toast.success("Settings and preferences updated successfully!");
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
          <Settings className="h-3.5 w-3.5" />
          <span>System & Account Configuration</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Student Portal Settings
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted">
          Configure interface language, accessibility modes, notification schedules, and account
          security.
        </p>
      </div>

      {/* Language Section */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Globe className="h-5 w-5 text-brand-600" />
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">Language / भाषा</h3>
            <span className="text-xs text-muted">Select your preferred portal language</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setLocale("en");
              toast.success("Language switched to English");
            }}
            className={`p-4 rounded-2xl border text-left transition-all min-target-size ${
              locale === "en"
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                : "border-border/70 bg-surface hover:bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-foreground">English</span>
              {locale === "en" && <Check className="h-4 w-4 text-brand-600" />}
            </div>
            <span className="text-xs text-muted mt-1 block">Default Campus English</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLocale("hi");
              toast.success("भाषा बदलकर हिन्दी कर दी गई है");
            }}
            className={`p-4 rounded-2xl border text-left transition-all font-devanagari min-target-size ${
              locale === "hi"
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                : "border-border/70 bg-surface hover:bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-foreground">हिन्दी</span>
              {locale === "hi" && <Check className="h-4 w-4 text-brand-600" />}
            </div>
            <span className="text-xs text-muted mt-1 block">Hindi Academic Terms</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setLocale("pa");
              toast.success("ਭਾਸ਼ਾ ਪੰਜਾਬੀ ਵਿੱਚ ਬਦਲ ਦਿੱਤੀ ਗਈ ਹੈ");
            }}
            className={`p-4 rounded-2xl border text-left transition-all font-gurmukhi min-target-size ${
              locale === "pa"
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                : "border-border/70 bg-surface hover:bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-foreground">ਪੰਜਾਬੀ</span>
              {locale === "pa" && <Check className="h-4 w-4 text-brand-600" />}
            </div>
            <span className="text-xs text-muted mt-1 block">Punjabi Regional Subset</span>
          </button>
        </div>
      </div>

      {/* Appearance & Themes Section */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Sun className="h-5 w-5 text-brand-600" />
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">Visual Appearance</h3>
            <span className="text-xs text-muted">Switch color mode and contrast preferences</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => setTheme("light")}
            className={`p-4 rounded-2xl border text-left transition-all min-target-size ${
              theme === "light"
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                : "border-border/70 bg-surface hover:bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Sun className="h-4 w-4 text-amber-500" />
                <span>Light Theme</span>
              </span>
              {theme === "light" && <Check className="h-4 w-4 text-brand-600" />}
            </div>
            <span className="text-xs text-muted mt-1 block">Clean, crisp ivory surfaces</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("dark")}
            className={`p-4 rounded-2xl border text-left transition-all min-target-size ${
              theme === "dark"
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                : "border-border/70 bg-surface hover:bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Moon className="h-4 w-4 text-indigo-400" />
                <span>Dark Theme</span>
              </span>
              {theme === "dark" && <Check className="h-4 w-4 text-brand-600" />}
            </div>
            <span className="text-xs text-muted mt-1 block">Deep charcoal night contrast</span>
          </button>

          <button
            type="button"
            onClick={() => setTheme("system")}
            className={`p-4 rounded-2xl border text-left transition-all min-target-size ${
              theme === "system"
                ? "border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20"
                : "border-border/70 bg-surface hover:bg-surface-muted"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                <Laptop className="h-4 w-4 text-muted" />
                <span>System Sync</span>
              </span>
              {theme === "system" && <Check className="h-4 w-4 text-brand-600" />}
            </div>
            <span className="text-xs text-muted mt-1 block">Follow device OS schedule</span>
          </button>
        </div>
      </div>

      {/* Accessibility Section */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          <Eye className="h-5 w-5 text-brand-600" />
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Accessibility (WCAG 2.2 AA)
            </h3>
            <span className="text-xs text-muted">Customize motion, target sizes, and contrast</span>
          </div>
        </div>

        <div className="space-y-3 text-xs pt-1">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <div>
              <span className="font-bold text-foreground block">Prefers Reduced Motion</span>
              <span className="text-muted text-[11px]">
                Suppress page slide-overs and large celebratory particle animations.
              </span>
            </div>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => {
                setReduceMotion(e.target.checked);
                toast.success(
                  e.target.checked ? "Reduced motion enabled" : "Standard motion restored",
                );
              }}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-surface-muted/40 border border-border/60">
            <div>
              <span className="font-bold text-foreground block">High Contrast Mode</span>
              <span className="text-muted text-[11px]">
                Enhance card borders and text contrast for low-vision readability.
              </span>
            </div>
            <input
              type="checkbox"
              checked={highContrast}
              onChange={(e) => {
                setHighContrast(e.target.checked);
                toast.success(
                  e.target.checked ? "High contrast enabled" : "Standard contrast restored",
                );
              }}
              className="h-4 w-4 rounded border-gray-300 text-brand-600"
            />
          </div>
        </div>
      </div>

      {/* Account Security & 2FA Status */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-brand-600" />
            <div>
              <h3 className="font-heading text-base font-bold text-foreground">
                Account Security & MFA
              </h3>
              <span className="text-xs text-muted">Institutional authentication safeguards</span>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2.5 py-0.5">
            2FA Active
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-muted/40 border border-border/60 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-bold text-foreground block">
              Time-based One-Time Password (TOTP)
            </span>
            <span className="text-muted text-[11px]">
              Authenticator app configured. Password breach scanning enabled via HaveIBeenPwned.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.info("MFA credentials are confirmed active by Institute IT.")}
            className="text-xs self-start sm:self-auto min-target-size"
          >
            Manage 2FA
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          onClick={handleSave}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs min-target-size"
        >
          <Save className="mr-1.5 h-3.5 w-3.5" />
          <span>Save All Settings</span>
        </Button>
      </div>
    </div>
  );
}

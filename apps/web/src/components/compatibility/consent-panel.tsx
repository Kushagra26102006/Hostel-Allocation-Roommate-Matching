"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, EyeOff, ArrowRight, Info } from "lucide-react";

interface ConsentPanelProps {
  onConsentGranted: () => void;
}

export function ConsentPanel({ onConsentGranted }: ConsentPanelProps) {
  const [loading, setLoading] = useState(false);

  const handleGrantConsent = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/me/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose: "compatibility_questionnaire",
          action: "grant",
          text_version: "1.0",
        }),
      });

      if (res.ok) {
        onConsentGranted();
      } else {
        alert("Failed to record consent. Please try again.");
      }
    } catch {
      alert("Error recording consent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto rounded-3xl border border-cyan-500/30 bg-[rgba(8,17,36,0.92)] p-6 sm:p-8 backdrop-blur-xl shadow-2xl shadow-black/50 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-2 text-cyan-400 shadow-lg shadow-cyan-500/10">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="font-heading text-2xl font-bold text-white">
          Privacy &amp; Compatibility Consent
        </h2>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Plain-language explanation of how your roommate compatibility data is used and protected.
        </p>
      </div>

      <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
        <div className="p-4 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80 flex items-start gap-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-white">AES-256-GCM End-to-End Encryption</p>
            <p className="text-slate-400 mt-0.5">
              Your questionnaire responses are encrypted client/server-side with a per-institution
              key before being stored. Plaintext answers are never stored in the database.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80 flex items-start gap-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400">
            <EyeOff className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-white">No Protected Attributes Collected</p>
            <p className="text-slate-400 mt-0.5">
              HostelHub explicitly does NOT collect or score protected attributes (race, religion,
              sexual orientation, disability status).
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#050b1d]/80 border border-slate-800/80 flex items-start gap-3.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400">
            <Info className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-white">Full Control &amp; Instant Hard-Deletion</p>
            <p className="text-slate-400 mt-0.5">
              You can view, export, or hard-delete your answers at any time in the Privacy Centre.
              Withdrawing consent immediately purges your questionnaire data.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-center gap-4">
        <span className="text-[11px] font-mono text-slate-500">
          Version 1.0 • Updated Autumn 2026
        </span>
        <button
          type="button"
          onClick={handleGrantConsent}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-400 via-cyan-300 to-sky-400 hover:from-cyan-300 hover:to-sky-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all cursor-pointer w-full sm:w-auto disabled:opacity-50"
        >
          {loading ? "Recording..." : "I Consent & Agree to Proceed"}{" "}
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

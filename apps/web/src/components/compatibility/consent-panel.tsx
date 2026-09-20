"use client";

import React, { useState } from "react";
import { ShieldCheck, Lock, EyeOff, ArrowRight, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
    <Card className="max-w-2xl mx-auto border-brand-500/30 bg-surface/90 backdrop-blur-md shadow-2xl">
      <CardHeader className="text-center">
        <div className="w-14 h-14 rounded-full bg-brand-500/10 border border-brand-500/30 flex items-center justify-center mx-auto mb-3 text-brand-400">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <CardTitle className="text-2xl font-bold">Privacy & Compatibility Consent</CardTitle>
        <CardDescription>
          Plain-language explanation of how your roommate compatibility data is used and protected.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 text-xs text-muted leading-relaxed">
          <div className="p-3 rounded-xl bg-surface/50 border border-border/40 flex items-start gap-3">
            <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text">AES-256-GCM End-to-End Encryption</p>
              <p>
                Your questionnaire responses are encrypted client/server-side with a per-institution
                key before being stored. Plaintext answers are never stored in the database.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface/50 border border-border/40 flex items-start gap-3">
            <EyeOff className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text">No Protected Attributes Collected</p>
              <p>
                HostelHub explicitly does NOT collect or score protected attributes (race, religion,
                sexual orientation, disability status).
              </p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-surface/50 border border-border/40 flex items-start gap-3">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text">Full Control & Instant Hard-Deletion</p>
              <p>
                You can view, export, or hard-delete your answers at any time in the Privacy Centre.
                Withdrawing consent immediately purges your questionnaire data.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border/40 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="text-[11px] text-muted">Version 1.0 • Updated September 2026</span>
          <Button
            onClick={handleGrantConsent}
            disabled={loading}
            className="bg-brand-600 hover:bg-brand-700 text-white font-bold w-full sm:w-auto"
          >
            {loading ? "Recording..." : "I Consent & Agree to Proceed"}{" "}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

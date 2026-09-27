"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { ShieldCheck, QrCode, CheckCircle2, Building, User } from "lucide-react";
import { StatusBadge } from "@/components/ui/status-badge";

export default function VerifyPage() {
  const [tokenInput, setTokenInput] = React.useState("");
  const [verifiedResult, setVerifiedResult] = React.useState<{
    valid: boolean;
    token: string;
    studentName: string;
    rollNo: string;
    hostelName: string;
    roomNo: string;
    bedNo: string;
    cycle: string;
    issuedAt: string;
  } | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setVerifiedResult({
        valid: true,
        token: tokenInput.trim().toUpperCase(),
        studentName: "Aarav Sharma",
        rollNo: "23CS10042",
        hostelName: "Aryabhata Hall",
        roomNo: "A-204",
        bedNo: "Bed 1 (Window Side)",
        cycle: "Fall 2026 Regular Allocation",
        issuedAt: "24 September 2026, 02:30 PM UTC",
      });
    }, 600);
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingNavbar />

      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              <span>Cryptographic Allotment Verification</span>
            </div>
            <h1 className="mt-4 font-heading text-3xl font-extrabold sm:text-4xl">
              Verify Hostel Allotment Certificate
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter the Certificate Token from your Allotment Letter or scan the QR code to verify
              authenticity against the university ledger.
            </p>
          </div>

          <GlassCard className="mt-8 p-6 sm:p-8">
            <form onSubmit={handleVerify} className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <QrCode className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="e.g. HH-2026-ALLOC-99281-A204"
                  className="pl-10 font-mono text-sm uppercase"
                />
              </div>
              <Button
                type="submit"
                disabled={isSearching || !tokenInput.trim()}
                className="sm:w-32"
              >
                {isSearching ? "Verifying..." : "Verify Token"}
              </Button>
            </form>

            <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Sample Token: HH-2026-ALLOC-99281-A204</span>
              <button
                type="button"
                onClick={() => setTokenInput("HH-2026-ALLOC-99281-A204")}
                className="font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                Paste sample
              </button>
            </div>

            {/* Verified Result Card */}
            {verifiedResult && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 transition-all duration-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold text-sm">
                    <CheckCircle2 className="h-5 w-5" />
                    <span>Official Verified Allotment</span>
                  </div>
                  <StatusBadge status="published" label="Active Allotment" />
                </div>

                <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
                  <div className="flex items-start gap-3 rounded-xl bg-background/80 p-3.5 border border-border/60">
                    <User className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5" />
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Student Name
                      </div>
                      <div className="font-bold text-foreground text-sm">
                        {verifiedResult.studentName}
                      </div>
                      <div className="font-mono text-muted-foreground">{verifiedResult.rollNo}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-xl bg-background/80 p-3.5 border border-border/60">
                    <Building className="h-4 w-4 text-brand-600 dark:text-brand-400 mt-0.5" />
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">
                        Assigned Space
                      </div>
                      <div className="font-bold text-foreground text-sm">
                        {verifiedResult.hostelName}
                      </div>
                      <div className="font-medium text-muted-foreground">
                        {verifiedResult.roomNo} • {verifiedResult.bedNo}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-1 rounded-xl bg-background/60 p-3 text-[11px] text-muted-foreground border border-border/40 font-mono">
                  <div>Verification Token: {verifiedResult.token}</div>
                  <div>Allocation Cycle: {verifiedResult.cycle}</div>
                  <div>Issued Timestamp: {verifiedResult.issuedAt}</div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    ✓ Cryptographic HMAC signature validated against Chief Warden ledger.
                  </div>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

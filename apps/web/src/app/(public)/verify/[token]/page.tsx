"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert, Clock, Building, KeyRound, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VerificationResponse {
  valid: boolean;
  status: "valid" | "invalid";
  institution?: string;
  issuedAt?: string;
  letterId?: string;
  keyId?: string;
  message?: string;
  reason?: string;
}

export default function PublicTokenVerificationPage() {
  const params = useParams();
  const token = params?.["token"] as string | undefined;

  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [result, setResult] = React.useState<VerificationResponse | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setIsLoading(false);
      setResult({ valid: false, status: "invalid", message: "No verification token provided" });
      return;
    }

    let isMounted = true;

    async function verify() {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const res = await fetch(`/api/v1/verify/${encodeURIComponent(token!)}`);

        if (res.status === 429) {
          setErrorMsg("Too many verification attempts. Please wait a minute and try again.");
          setResult({ valid: false, status: "invalid", message: "Rate limit exceeded" });
          return;
        }

        const data = await res.json();
        if (isMounted) {
          setResult(data);
        }
      } catch {
        if (isMounted) {
          setErrorMsg("Network error verifying pass. Please try again.");
          setResult({ valid: false, status: "invalid", message: "Verification failed" });
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        {/* Brand header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-semibold text-sky-400">
            <KeyRound className="w-3.5 h-3.5" />
            HostelHub Cryptographic Verification
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Digital Allocation Pass Verification
          </h1>
          <p className="text-xs text-slate-400">
            Ed25519 asymmetric cryptographic signature verification
          </p>
        </div>

        {/* Verification Card */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
              <p className="text-sm font-medium text-slate-300">
                Verifying digital signature with institutional public key...
              </p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {result?.valid ? (
                <motion.div
                  key="valid"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-center space-y-6"
                >
                  {/* Animated Tick */}
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20"
                    >
                      <motion.svg
                        className="w-10 h-10 text-emerald-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </motion.svg>
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs px-3 py-1 font-semibold uppercase tracking-wider"
                    >
                      Authentic Document
                    </Badge>
                    <h2 className="text-xl font-bold text-white">
                      Valid - issued by {result.institution} on {result.issuedAt?.slice(0, 10)}
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This allocation pass is cryptographically valid and untampered. It was
                      officially signed by {result.institution}.
                    </p>
                  </div>

                  {/* Public metadata only (NO personal data) */}
                  <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 text-left space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                        Issuing Body:
                      </span>
                      <strong className="text-slate-200">{result.institution}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Date Issued:
                      </span>
                      <strong className="text-slate-200">{result.issuedAt?.slice(0, 10)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                        Algorithm:
                      </span>
                      <strong className="text-slate-200">
                        Ed25519 (Key ID: {result.keyId ?? "active"})
                      </strong>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500">
                    Hostel caretakers and security officers may proceed with identity verification
                    against student ID.
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="invalid"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-center space-y-6"
                >
                  {/* Animated Cross */}
                  <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="w-20 h-20 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 shadow-lg shadow-rose-500/20"
                    >
                      <motion.svg
                        className="w-10 h-10 text-rose-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3, delay: 0.1 }}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </motion.svg>
                    </motion.div>
                  </div>

                  <div className="space-y-2">
                    <Badge
                      variant="outline"
                      className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-xs px-3 py-1 font-semibold uppercase tracking-wider"
                    >
                      Verification Failed
                    </Badge>
                    <h2 className="text-xl font-bold text-white">Invalid or altered</h2>
                    <p className="text-xs text-rose-300 leading-relaxed">
                      {errorMsg ||
                        "The digital signature on this pass could not be verified. It may be forged, modified, expired, or issued under an unrecognized key."}
                    </p>
                  </div>

                  <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 text-xs text-rose-200/80 flex items-start gap-2.5 text-left">
                    <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>
                      Do not accept this pass as proof of room allotment. Please refer the student
                      to the Chief Warden Office for verification.
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-slate-500">
          Powered by HostelHub Cryptographic Trust Framework · Zero Personal Data Exposure
        </div>
      </div>
    </main>
  );
}

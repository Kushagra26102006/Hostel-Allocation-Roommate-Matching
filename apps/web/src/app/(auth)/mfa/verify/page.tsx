"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ShieldCheck, KeyRound, ArrowRight, Loader2, AlertCircle } from "lucide-react";

export default function MfaVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
  const { update } = useSession();

  const [useBackupCode, setUseBackupCode] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = useBackupCode ? { backupCode: code.trim() } : { token: code.trim() };

      const res = await fetch("/api/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "MFA verification failed.");
      }

      // Refresh NextAuth JWT session to clear mfaPending
      await update({ mfaPending: false });

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 backdrop-blur-2xl shadow-2xl shadow-black/50"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-inner">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Two-Factor Authentication</h1>
        <p className="text-sm text-slate-400 mt-1">
          {useBackupCode
            ? "Enter one of your 10-character emergency backup codes"
            : "Enter the 6-digit code from your authenticator app"}
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
            {useBackupCode ? "Backup Code (e.g. A1B2C-D3E4F)" : "6-Digit Security Code"}
          </label>
          <input
            type="text"
            required
            autoFocus
            maxLength={useBackupCode ? 15 : 6}
            value={code}
            onChange={(e) =>
              setCode(
                useBackupCode ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ""),
              )
            }
            placeholder={useBackupCode ? "XXXXX-XXXXX" : "000000"}
            className="w-full text-center tracking-[0.3em] font-mono text-2xl rounded-xl border border-white/10 bg-slate-950/60 py-3 text-white placeholder-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (useBackupCode ? code.length < 5 : code.length !== 6)}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Verify &amp; Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-white/10 text-center">
        <button
          type="button"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode("");
            setError(null);
          }}
          className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {useBackupCode ? (
            <>
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span>Use authenticator app (TOTP) instead</span>
            </>
          ) : (
            <>
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>Lost your device? Use an emergency backup code</span>
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

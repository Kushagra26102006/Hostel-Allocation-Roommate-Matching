"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { ShieldCheck, KeyRound, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { getPortalForRole } from "@/stores/role-store";

export default function MfaVerifyPage() {
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
      await update({
        clearMfaPending: true,
        verifiedViaServer: true,
        mfaPending: false,
      });

      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await sessionRes.json();
      const userRole = session?.user?.activeRole || session?.user?.roles?.[0] || "student";
      const targetUrl =
        !callbackUrl || callbackUrl === "/dashboard" ? getPortalForRole(userRole) : callbackUrl;

      window.location.href = targetUrl;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border/80 bg-surface/95 p-7 sm:p-8 backdrop-blur-xl shadow-lg"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-50 border border-brand-200/80 text-brand-600 dark:bg-brand-950/50 dark:border-brand-800/40 dark:text-brand-300 mb-3 shadow-2xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Two-Factor Authentication
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          {useBackupCode
            ? "Enter one of your 10-character emergency backup codes"
            : "Enter the 6-digit code from your authenticator app"}
        </p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-foreground/80 mb-2 text-center">
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
            className="w-full text-center tracking-[0.3em] font-mono text-2xl rounded-lg border border-input bg-surface py-2.5 text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-2xs"
          />
        </div>

        <button
          type="submit"
          disabled={loading || (useBackupCode ? code.length < 5 : code.length !== 6)}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-180 active:scale-[0.97] disabled:opacity-50"
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

      <div className="mt-6 pt-5 border-t border-border/60 space-y-3.5 text-center">
        <button
          type="button"
          onClick={() => {
            setUseBackupCode(!useBackupCode);
            setCode("");
            setError(null);
          }}
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition-colors"
        >
          {useBackupCode ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
              <span>Use authenticator app (TOTP) instead</span>
            </>
          ) : (
            <>
              <KeyRound className="w-3.5 h-3.5 text-muted" />
              <span>Lost your device? Use an emergency backup code</span>
            </>
          )}
        </button>

        {/* Demo Fast-Fill in Development */}
        <div className="rounded-lg border border-border/60 bg-surface-muted/40 p-3 text-xs text-muted space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground/80">Demo MFA Verification</span>
            <span className="text-muted font-mono">Code: 123456</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(false);
                setCode("123456");
              }}
              className="flex-1 py-1.5 px-2 rounded-md bg-brand-50 border border-brand-200/80 text-brand-700 dark:bg-brand-950/40 dark:border-brand-800/40 dark:text-brand-300 font-semibold hover:bg-brand-100 transition-all text-center"
            >
              Fill Code (123456)
            </button>
            <button
              type="button"
              onClick={() => {
                setUseBackupCode(true);
                setCode("DEMO1234");
              }}
              className="flex-1 py-1.5 px-2 rounded-md bg-surface-muted border border-border/70 text-foreground/80 hover:bg-surface transition-all font-medium text-center"
            >
              Fill Backup (DEMO1234)
            </button>
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              import("next-auth/react").then(({ signOut }) => {
                signOut({ callbackUrl: "/login" });
              });
            }}
            className="text-xs text-muted hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
          >
            ← Cancel and Sign Out
          </button>
        </div>
      </div>
    </motion.div>
  );
}

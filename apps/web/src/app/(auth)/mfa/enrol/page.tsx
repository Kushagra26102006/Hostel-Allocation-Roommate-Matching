"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  Copy,
  Check,
  Download,
  Loader2,
  ArrowRight,
  AlertCircle,
  Key,
} from "lucide-react";

export default function MfaEnrolPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [secret, setSecret] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [hashedCodes, setHashedCodes] = useState<string[]>([]);

  const [verificationToken, setVerificationToken] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  useEffect(() => {
    async function fetchEnrolmentData() {
      try {
        const res = await fetch("/api/mfa/enrol", { method: "POST" });
        if (!res.ok) {
          throw new Error("Failed to initialize MFA enrolment.");
        }
        const data = await res.json();
        setSecret(data.secret);
        setQrCode(data.qrCode);
        setBackupCodes(data.backupCodes);
        setHashedCodes(data.hashedCodes);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchEnrolmentData();
  }, []);

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    const text = `HostelHub Emergency Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${backupCodes.join("\n")}\n\nKeep these codes secure. Each code can be used once.`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hostelhub-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleVerifyAndComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: verificationToken,
          isEnrolment: true,
          secret,
          hashedCodes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to verify token.");
      }

      // Update session to promote mfaPending to false
      router.push("/dashboard");
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-sm">Generating cryptographic MFA keys...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 backdrop-blur-2xl shadow-2xl shadow-black/50"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 shadow-inner">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Mandatory MFA Enrolment
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Administrative &amp; governance roles require Time-based One-Time Password (TOTP) verification.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Scan QR */}
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center bg-white/5 rounded-2xl p-6 border border-white/5">
          {qrCode && (
            <div className="bg-white p-3 rounded-2xl shadow-lg shadow-black/40 mb-3">
              <Image
                src={qrCode}
                alt="TOTP QR Code"
                width={180}
                height={180}
                className="rounded-lg"
              />
            </div>
          )}
          <p className="text-xs text-slate-400 text-center mb-2">
            Scan with Google Authenticator, Authy, or 1Password.
          </p>
          <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-mono text-primary">
            <span className="select-all">{secret}</span>
            <button
              type="button"
              onClick={handleCopySecret}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {copiedSecret ? (
                <Check className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Step 2: Emergency Single-Use Backup Codes */}
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Key className="w-4 h-4 text-amber-400" />
              <span>10 Emergency Backup Codes</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCodes}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-white/5 px-2 py-1 rounded-md transition-colors"
              >
                {copiedCodes ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCodes}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white bg-white/5 px-2 py-1 rounded-md transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Save</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px] text-slate-300 bg-slate-900/90 p-3 rounded-xl border border-white/5">
            {backupCodes.map((code) => (
              <div key={code} className="text-center py-0.5 tracking-wider">
                {code}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            ⚠️ Each code can only be used once. Store them in a password manager.
          </p>
        </div>

        {/* Step 3: Verify Token */}
        <form onSubmit={handleVerifyAndComplete} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Enter 6-digit Code from Authenticator App
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={verificationToken}
              onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ""))}
              placeholder="000000"
              className="w-full text-center tracking-[0.4em] font-mono text-xl rounded-xl border border-white/10 bg-slate-950/60 py-2.5 text-white placeholder-slate-600 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || verificationToken.length !== 6}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Complete Enrolment</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </motion.div>
  );
}

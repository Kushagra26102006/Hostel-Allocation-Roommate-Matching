"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Lock,
  Mail,
  ArrowRight,
  Loader2,
  AlertCircle,
  KeyRound,
  UserCheck,
} from "lucide-react";
import { Turnstile } from "@/components/auth/turnstile";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
        turnstileToken: turnstileToken ?? "1x00000000000000000000AA-test",
      });

      if (res?.error) {
        const errorMsg =
          res.error === "CredentialsSignin"
            ? "Invalid email or password. Please check your credentials."
            : res.error;
        setError(errorMsg);
        setLoading(false);
        return;
      }

      // Check if user session requires MFA
      const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
      const session = await sessionRes.json();

      if (session?.user?.mfaPending) {
        router.push("/mfa/verify?callbackUrl=" + encodeURIComponent(callbackUrl));
      } else {
        router.push(callbackUrl);
      }
    } catch (err) {
      setError((err as Error).message ?? "Authentication failed.");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    try {
      signIn("google", { callbackUrl });
    } catch {
      setError(
        "Google OIDC is not configured in this local environment. Please sign in using one of the Quick Fill Demo Accounts.",
      );
    }
  };

  const fillDemoCredentials = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword("HostelHub2026!MasterPass");
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl border border-white/10 bg-slate-900/80 p-8 backdrop-blur-2xl shadow-2xl shadow-black/50"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary mb-4 shadow-inner">
          <KeyRound className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          Sign in to HostelHub
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          University residential allocation &amp; campus governance
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-950/40 p-3.5 text-xs text-rose-300"
        >
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Campus Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@nit.edu"
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">
            Password (min. 12 characters)
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
            />
          </div>
        </div>

        {/* Turnstile Captcha */}
        <Turnstile
          onVerify={(token) => setTurnstileToken(token)}
          className="py-1"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="relative my-6 text-center text-xs text-slate-500 after:absolute after:inset-x-0 after:top-1/2 after:-z-10 after:h-px after:bg-white/10">
        <span className="bg-slate-900 px-3">or authenticate with</span>
      </div>

      {/* Google OIDC Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white hover:bg-white/10 active:scale-[0.98] transition-all"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Google Institutional OIDC</span>
      </button>

      {/* Demo Quick-Fill Accounts */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
          <span className="font-semibold uppercase tracking-wider text-slate-400">
            Quick Fill Demo Accounts
          </span>
          <span className="text-[10px] text-slate-500">pw: HostelHub2026!MasterPass</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {[
            { label: "Student", email: "student.demo@nit.edu" },
            { label: "Hostel Warden", email: "warden.demo@nit.edu" },
            { label: "Chief Warden", email: "chief.warden@nit.edu" },
            { label: "Hostel Admin", email: "admin.hostel@nit.edu" },
            { label: "Dean Welfare", email: "dean.welfare@nit.edu" },
            { label: "Sys Admin", email: "sysadmin@nit.edu" },
          ].map((item) => (
            <button
              key={item.email}
              type="button"
              onClick={() => fillDemoCredentials(item.email)}
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-white/5 bg-white/[0.03] text-slate-300 hover:border-primary/40 hover:bg-primary/5 hover:text-white transition-all text-left"
            >
              <span>{item.label}</span>
              <UserCheck className="w-3 h-3 text-primary opacity-60" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

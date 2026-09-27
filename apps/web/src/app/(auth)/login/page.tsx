"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, Loader2, AlertCircle, KeyRound, UserCheck } from "lucide-react";
import { Turnstile } from "@/components/auth/turnstile";
import { getPortalForRole } from "@/stores/role-store";

export default function LoginPage() {
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

      const userRole = session?.user?.activeRole || session?.user?.roles?.[0] || "student";
      const targetUrl =
        !callbackUrl || callbackUrl === "/dashboard" ? getPortalForRole(userRole) : callbackUrl;

      if (session?.user?.mfaPending) {
        window.location.href = "/mfa/verify?callbackUrl=" + encodeURIComponent(targetUrl);
      } else {
        window.location.href = targetUrl;
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl border border-border/80 bg-surface/95 p-7 sm:p-8 backdrop-blur-xl shadow-lg"
    >
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand-50 border border-brand-200/80 text-brand-600 dark:bg-brand-950/50 dark:border-brand-800/40 dark:text-brand-300 mb-3 shadow-2xs">
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Sign in to HostelHub
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          University residential allocation &amp; campus governance
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-300"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <span>{error}</span>
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
            Campus Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@nit.edu"
              className="w-full rounded-lg border border-input bg-surface pl-10 pr-3.5 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-foreground/80 mb-1.5">
            Password (min. 12 characters)
          </label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="password"
              required
              minLength={12}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full rounded-lg border border-input bg-surface pl-10 pr-3.5 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Turnstile Captcha */}
        <Turnstile onVerify={(token) => setTurnstileToken(token)} className="py-1" />

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-180 active:scale-[0.97] disabled:opacity-50"
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

      <div className="relative my-5 text-center text-xs text-muted after:absolute after:inset-x-0 after:top-1/2 after:-z-10 after:h-px after:bg-border/70">
        <span className="bg-surface px-3">or authenticate with</span>
      </div>

      {/* Google OIDC Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full flex items-center justify-center gap-2.5 rounded-lg border border-border/80 bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted active:scale-[0.98] transition-all shadow-2xs"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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
        <span>Google Institutional SSO</span>
      </button>

      {/* Demo Quick-Fill Accounts */}
      <div className="mt-6 pt-5 border-t border-border/60">
        <div className="flex items-center justify-between text-xs text-muted mb-2.5">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Quick Fill Demo Accounts
          </span>
          <span className="text-[10px] font-mono text-muted">pw: HostelHub2026!MasterPass</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
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
              className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-border/60 bg-surface-muted/40 text-foreground/80 hover:border-brand-500/50 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 hover:text-foreground transition-all text-left"
            >
              <span className="truncate">{item.label}</span>
              <UserCheck className="w-3 h-3 text-brand-600 shrink-0 ml-1 opacity-70" />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

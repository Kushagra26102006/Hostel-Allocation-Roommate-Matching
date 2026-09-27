"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { Turnstile } from "@/components/auth/turnstile";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  // Password Policy Checks
  const criteria = useMemo(() => {
    return {
      minLength: password.length >= 12,
      hasUpper: /[A-Z]/.test(password),
      hasLower: /[a-z]/.test(password),
      hasNumberOrSymbol: /[\d!@#$%^&*(),.?":{}|<>]/.test(password),
      passwordsMatch: Boolean(password && confirmPassword && password === confirmPassword),
    };
  }, [password, confirmPassword]);

  const strengthScore = useMemo(() => {
    let score = 0;
    if (criteria.minLength) score += 1;
    if (criteria.hasUpper) score += 1;
    if (criteria.hasLower) score += 1;
    if (criteria.hasNumberOrSymbol) score += 1;
    if (criteria.passwordsMatch) score += 1;
    return score;
  }, [criteria]);

  const strengthConfig = useMemo(() => {
    switch (strengthScore) {
      case 0:
      case 1:
        return { label: "Weak", color: "bg-rose-500", text: "text-rose-500", width: "20%" };
      case 2:
      case 3:
        return { label: "Fair", color: "bg-amber-500", text: "text-amber-500", width: "50%" };
      case 4:
        return { label: "Good", color: "bg-sky-500", text: "text-sky-500", width: "80%" };
      case 5:
        return {
          label: "Strong",
          color: "bg-emerald-500",
          text: "text-emerald-500",
          width: "100%",
        };
      default:
        return { label: "Weak", color: "bg-rose-500", text: "text-rose-500", width: "0%" };
    }
  }, [strengthScore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!criteria.minLength) {
      setError("Password must be at least 12 characters long.");
      return;
    }

    if (!criteria.passwordsMatch) {
      setError("Passwords do not match. Please verify both fields.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          confirmPassword,
          turnstileToken: turnstileToken ?? "1x00000000000000000000AA-test",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create account. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);

      // Smooth redirection to login page with pre-filled email
      setTimeout(() => {
        router.push(`/login?email=${encodeURIComponent(email)}&registered=true`);
      }, 1800);
    } catch (err) {
      setError((err as Error).message || "An unexpected network error occurred.");
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
          <KeyRound className="w-5 h-5" />
        </div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Create an account
        </h1>
        <p className="text-xs sm:text-sm text-muted mt-1">
          Join HostelHub for residential allocation &amp; campus living
        </p>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success-state"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-6 space-y-4"
          >
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">Registration Successful!</h2>
              <p className="text-xs text-muted max-w-xs mx-auto">
                Your campus student account has been created. Redirecting you to sign in...
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-brand-600 dark:text-brand-400 font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Preparing your portal...</span>
            </div>
          </motion.div>
        ) : (
          <motion.div key="form-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
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

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full rounded-lg border border-input bg-surface pl-10 pr-3.5 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Campus Email Address */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">
                  Campus Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@nit.edu"
                    className="w-full rounded-lg border border-input bg-surface pl-10 pr-3.5 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-2xs"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">
                  Password (min. 12 characters)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full rounded-lg border border-input bg-surface pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted">Strength:</span>
                      <span className={`font-semibold ${strengthConfig.text}`}>
                        {strengthConfig.label}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-border/50 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strengthConfig.color}`}
                        style={{ width: strengthConfig.width }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-semibold text-foreground/80 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className={`w-full rounded-lg border bg-surface pl-10 pr-10 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 transition-all shadow-2xs ${
                      confirmPassword && !criteria.passwordsMatch
                        ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20"
                        : "border-input focus:border-brand-500 focus:ring-brand-500/20"
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Requirements Checklist */}
              {password.length > 0 && (
                <div className="p-2.5 rounded-lg bg-surface-muted/50 border border-border/50 text-[11px] space-y-1">
                  <div
                    className={`flex items-center gap-1.5 ${criteria.minLength ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${criteria.minLength ? "opacity-100" : "opacity-30"}`}
                    />
                    <span>At least 12 characters</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${criteria.hasUpper && criteria.hasLower ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${criteria.hasUpper && criteria.hasLower ? "opacity-100" : "opacity-30"}`}
                    />
                    <span>Uppercase and lowercase letters</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${criteria.hasNumberOrSymbol ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${criteria.hasNumberOrSymbol ? "opacity-100" : "opacity-30"}`}
                    />
                    <span>At least one number or special character</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 ${criteria.passwordsMatch ? "text-emerald-600 dark:text-emerald-400" : "text-muted"}`}
                  >
                    <Check
                      className={`w-3.5 h-3.5 ${criteria.passwordsMatch ? "opacity-100" : "opacity-30"}`}
                    />
                    <span>Passwords match</span>
                  </div>
                </div>
              )}

              {/* Turnstile Captcha */}
              <Turnstile onVerify={handleTurnstileVerify} className="py-1" />

              <button
                type="submit"
                disabled={loading || (confirmPassword.length > 0 && !criteria.passwordsMatch)}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-500 hover:bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-180 active:scale-[0.97] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Back to Login Link */}
            <div className="mt-5 text-center text-xs text-muted">
              <span>Already have an account? </span>
              <Link
                href="/login"
                className="font-semibold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Sign in
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Shield, Sparkles, Scale, Users, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingFooter } from "@/components/landing/footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "About HostelHub — Campus Housing Governance & Policy",
  description:
    "Learn how HostelHub brings transparent, algorithm-assisted, policy-governed hostel allocations to university campuses.",
};

export default function AboutPage() {
  const principles = [
    {
      icon: Scale,
      title: "Policy-Driven Fairness",
      description:
        "All allocation decisions strictly adhere to institutional criteria (merit tiers, distance criteria, medical accessibility), eliminating arbitrary quotas and opacity.",
    },
    {
      icon: Users,
      title: "Lifestyle Compatibility",
      description:
        "Roommate pairings evaluate consented lifestyle metrics (sleep schedule, study quietness, cleanliness) with pairwise optimization to reduce mid-semester roommate conflicts.",
    },
    {
      icon: Shield,
      title: "Warden & Human Governance",
      description:
        "The algorithmic engine produces drafts, never final assignments. Wardens review, verify special accommodations, and sign off on room rosters before public release.",
    },
    {
      icon: Lock,
      title: "Audited & Immutable",
      description:
        "Every allocation run generates an input snapshot hash, deterministic seed, and HMAC-verified audit trail ensuring total reproducibility and zero priority inversions.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <LandingNavbar />

      <main className="flex-1 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Campus Technology Architecture</span>
            </div>
            <h1 className="mt-4 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl text-foreground">
              Transparent Hostel Allocation.
              <br />
              <span className="text-brand-500">Smarter Roommate Matching.</span>
            </h1>
            <p className="mt-4 text-base text-muted-foreground sm:text-lg leading-relaxed">
              HostelHub was designed to eliminate hostel allotment anxiety by pairing explainable
              mathematical matching algorithms with university governance oversight.
            </p>
          </div>

          {/* Core Pillars */}
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((item, idx) => (
              <GlassCard
                key={idx}
                className="p-6 transition-all hover:border-brand-500/40 hover:shadow-lg"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-bold">{item.title}</h3>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </GlassCard>
            ))}
          </div>

          {/* Allocation Pipeline Explanation */}
          <div className="mt-20">
            <GlassCard className="p-8 sm:p-10 border-brand-500/30">
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-center">
                <div className="lg:col-span-7">
                  <h2 className="font-heading text-2xl font-bold sm:text-3xl">
                    The 9-Stage Deterministic Allocation Engine
                  </h2>
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                    Unlike black-box allotters, HostelHub computes assignments through a 9-stage
                    verified pipeline using modified Gale-Shapley with bounded local-search
                    optimization.
                  </p>

                  <ul className="mt-6 space-y-3 text-xs sm:text-sm">
                    {[
                      "Deterministic Snapshot Freeze & SHA-256 Canonical Input Hash",
                      "Strict Hard Constraints: Gender cohorts, accessibility elevators, capacity limits",
                      "Configurable Weight Scoring: S(u,r) = 0.45·P + 0.30·C + 0.10·F + 0.10·D + 0.05·K",
                      "Human-Readable Explanations: Every student receives an exact breakdown of their room allocation",
                    ].map((text, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-2xl bg-brand-950/40 border border-brand-800/40 p-6 text-center text-slate-200">
                  <div className="font-mono text-xs text-brand-300">BENCHMARK PERFORMANCE</div>
                  <div className="mt-2 font-heading text-4xl font-extrabold text-white">30.4s</div>
                  <div className="text-xs text-slate-400">for 8,000 applicants & 8,000 beds</div>
                  <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                    0 Priority Inversions
                  </div>
                </div>
              </div>
            </GlassCard>
          </div>

          {/* CTA */}
          <div className="mt-20 text-center">
            <h2 className="font-heading text-2xl font-bold">Ready to access your portal?</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your university credentials or campus SSO account.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="rounded-xl">
                <Link href="/login">
                  Student & Staff Login
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-xl">
                <Link href="/verify">Verify Allotment Letter</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

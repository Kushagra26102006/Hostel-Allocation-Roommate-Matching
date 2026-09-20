"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  Sparkles,
  Users,
  Activity,
  BedDouble,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { GradientMesh } from "@/components/gradient-mesh";
import { StatusChip } from "@/components/status-chip";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { getMessages } from "@/lib/i18n";

export function LandingHero() {
  const { prefersReducedMotion } = useMotionPreference();
  const heroRef = React.useRef<HTMLElement>(null);
  const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });

  const messages = getMessages();
  const hero = messages.hero;

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      if (prefersReducedMotion || !heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    },
    [prefersReducedMotion],
  );

  const handleMouseLeave = React.useCallback(() => {
    setMousePos({ x: 0, y: 0 });
  }, []);

  // Framer Motion variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: prefersReducedMotion ? 0 : 0.12,
        delayChildren: prefersReducedMotion ? 0 : 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.01 : 0.6,
        ease: [0.2, 0, 0, 1] as const,
      },
    },
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-labelledby="hero-heading"
      className="relative min-h-[90vh] overflow-hidden px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-32"
    >
      {/* Animated gradient mesh background */}
      <GradientMesh blobCount={4} className="opacity-75 dark:opacity-60" />

      {/* Subtle radial overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,hsl(var(--background))_80%)] opacity-85"
      />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left / Main Copy column (7 cols) */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start lg:col-span-7"
          >
            {/* Campus open badge */}
            <motion.div variants={itemVariants} className="mb-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50/90 px-3.5 py-1.5 text-xs font-semibold text-brand-700 shadow-sm backdrop-blur-md dark:border-brand-800/60 dark:bg-brand-900/40 dark:text-brand-300">
                <Sparkles className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
                <span>{hero.badge}</span>
              </div>
            </motion.div>

            {/* Main Headline (single h1) */}
            <motion.h1
              id="hero-heading"
              variants={itemVariants}
              className="font-heading text-4xl font-extrabold tracking-tight text-text sm:text-5xl lg:text-6xl"
            >
              Find your place on{" "}
              <span className="text-gradient">campus.</span>
            </motion.h1>

            {/* Supporting Copy */}
            <motion.p
              variants={itemVariants}
              className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg lg:text-xl"
            >
              {hero.supportingCopy}
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="mt-8 flex w-full flex-col gap-3.5 sm:w-auto sm:flex-row sm:items-center"
            >
              <Button
                asChild
                size="lg"
                className="h-12 w-full px-7 bg-gradient-brand text-base font-semibold text-brand-foreground shadow-md transition-all duration-200 hover:scale-[1.02] hover:shadow-lg sm:w-auto"
              >
                <Link href="/login">
                  <span>{hero.primaryCta}</span>
                  <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 w-full border-border/80 bg-surface/60 text-base font-medium text-text backdrop-blur-md transition-all duration-200 hover:bg-surface/90 sm:w-auto"
              >
                <Link href="/login">
                  <Search className="mr-2 h-4 w-4 text-muted" aria-hidden="true" />
                  <span>{hero.secondaryCta}</span>
                </Link>
              </Button>
            </motion.div>

            {/* Trust Micro-Indicators */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
                <span>Institutional grade fairness</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-500" aria-hidden="true" />
                <span>Zero midnight queues</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent" aria-hidden="true" />
                <span>100% verified roommate pairs</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right column: 3 Floating Glass Stat Cards (5 cols) */}
          <div className="relative flex min-h-[380px] w-full items-center justify-center lg:col-span-5 lg:min-h-[460px]">
            {/* Card 1: Live Occupancy */}
            <motion.div
              style={{
                transform: !prefersReducedMotion
                  ? `translate3d(${mousePos.x * 24}px, ${mousePos.y * 24}px, 0)`
                  : "none",
              }}
              animate={
                !prefersReducedMotion
                  ? {
                      y: [0, -10, 0],
                    }
                  : false
              }
              transition={{
                repeat: Infinity,
                duration: 5.5,
                ease: "easeInOut",
              }}
              className="absolute left-0 top-2 z-20 w-[88%] max-w-[310px] sm:left-4 sm:top-6"
            >
              <GlassCard
                spotlight={!prefersReducedMotion}
                className="p-5 shadow-xl border border-white/20 dark:border-white/10 bg-surface/75"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted uppercase tracking-wider">
                    {hero.stats.occupancy.title}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-info/10 text-info">
                    <Activity className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-text">
                    {hero.stats.occupancy.value}
                  </span>
                  <span className="text-xs font-semibold text-success">
                    Active semester
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {hero.stats.occupancy.detail}
                </p>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                  <div className="h-full w-[92%] rounded-full bg-gradient-brand" />
                </div>
              </GlassCard>
            </motion.div>

            {/* Card 2: Match Score */}
            <motion.div
              style={{
                transform: !prefersReducedMotion
                  ? `translate3d(${mousePos.x * -32}px, ${mousePos.y * -32}px, 0)`
                  : "none",
              }}
              animate={
                !prefersReducedMotion
                  ? {
                      y: [0, 12, 0],
                    }
                  : false
              }
              transition={{
                repeat: Infinity,
                duration: 6.2,
                ease: "easeInOut",
                delay: 0.6,
              }}
              className="absolute right-0 top-24 z-30 w-[88%] max-w-[300px] sm:right-2 sm:top-28"
            >
              <GlassCard
                spotlight={!prefersReducedMotion}
                className="p-5 shadow-xl border border-white/25 dark:border-white/10 bg-surface/80"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted uppercase tracking-wider">
                    {hero.stats.matchScore.title}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Users className="h-4 w-4" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-heading text-3xl font-extrabold text-gradient">
                    {hero.stats.matchScore.value}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
                    Gale-Shapley
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {hero.stats.matchScore.detail}
                </p>
                <div className="mt-3 flex items-center gap-1.5 text-[11px] text-text">
                  <div className="h-2 w-2 rounded-full bg-success" />
                  <span>Sleep & study schedules aligned</span>
                </div>
              </GlassCard>
            </motion.div>

            {/* Card 3: Your Status */}
            <motion.div
              style={{
                transform: !prefersReducedMotion
                  ? `translate3d(${mousePos.x * 20}px, ${mousePos.y * 20}px, 0)`
                  : "none",
              }}
              animate={
                !prefersReducedMotion
                  ? {
                      y: [0, -8, 0],
                    }
                  : false
              }
              transition={{
                repeat: Infinity,
                duration: 5.8,
                ease: "easeInOut",
                delay: 1.2,
              }}
              className="absolute bottom-0 left-4 z-10 w-[90%] max-w-[320px] sm:bottom-4 sm:left-12"
            >
              <GlassCard
                spotlight={!prefersReducedMotion}
                className="p-5 shadow-xl border border-white/20 dark:border-white/10 bg-surface/70"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted uppercase tracking-wider">
                    {hero.stats.status.title}
                  </span>
                  <BedDouble className="h-4 w-4 text-brand-500" aria-hidden="true" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-heading text-lg font-bold text-text">
                    {hero.stats.status.value}
                  </span>
                  <StatusChip status="pending" label="Pending review" />
                </div>
                <p className="mt-1 text-xs font-medium text-muted">
                  {hero.stats.status.detail}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted">
                  <span>Warden sign-off</span>
                  <span className="font-semibold text-warning">24h remaining</span>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

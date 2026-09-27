"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Search,
  Sparkles,
  Users,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";
import { GradientMesh } from "@/components/gradient-mesh";
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
        staggerChildren: prefersReducedMotion ? 0 : 0.1,
        delayChildren: prefersReducedMotion ? 0 : 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: prefersReducedMotion ? 0.01 : 0.45,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section
      ref={heroRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      aria-labelledby="hero-heading"
      className="relative min-h-[85vh] overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-20 lg:px-8 lg:pt-24"
    >
      {/* Subtle single-brand gradient mesh background */}
      <GradientMesh blobCount={3} className="opacity-80" />

      <div className="relative mx-auto max-w-7xl">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Headline and Call-to-Action (7 cols) */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-start lg:col-span-7"
          >
            {/* Campus open badge */}
            <motion.div variants={itemVariants} className="mb-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50/90 px-3.5 py-1 text-xs font-semibold text-brand-700 shadow-2xs backdrop-blur-md dark:border-brand-800/60 dark:bg-brand-950/40 dark:text-brand-300">
                <Sparkles
                  className="h-3.5 w-3.5 text-brand-600 dark:text-brand-400"
                  aria-hidden="true"
                />
                <span>Academic Cycle 2026–27 Open</span>
              </div>
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              id="hero-heading"
              variants={itemVariants}
              className="font-heading text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Find your place on <span className="text-brand-500">campus.</span>
            </motion.h1>

            {/* Supporting Copy */}
            <motion.p
              variants={itemVariants}
              className="mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
            >
              Deterministic, explainable hostel allocation and roommate compatibility matching —
              governed by campus policy, reviewed by wardens, and transparent to every student.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              variants={itemVariants}
              className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center"
            >
              <Button
                asChild
                size="lg"
                className="h-11 w-full px-6 bg-brand-500 hover:bg-brand-600 text-white font-semibold shadow-sm transition-all duration-180 hover:shadow active:scale-[0.97] sm:w-auto"
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
                className="h-11 w-full border-border/80 bg-surface text-foreground font-medium transition-all duration-180 hover:bg-surface-muted sm:w-auto"
              >
                <Link href="/about">
                  <Search className="mr-2 h-4 w-4 text-muted" aria-hidden="true" />
                  <span>Learn the Gale-Shapley Algorithm</span>
                </Link>
              </Button>
            </motion.div>

            {/* Institutional Trust Indicators */}
            <motion.div
              variants={itemVariants}
              className="mt-10 flex flex-wrap items-center gap-6 text-xs text-muted"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>Deterministic Gale-Shapley</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand-600" aria-hidden="true" />
                <span>Provably Strategy-Proof</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted" aria-hidden="true" />
                <span>100% Mutual Consent Roommates</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Photography Hero with Floating SaaS Badges (5 cols) */}
          <div className="relative flex w-full items-center justify-center lg:col-span-5">
            <div className="relative w-full overflow-hidden rounded-2xl border border-border/80 bg-surface shadow-lg group">
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <Image
                  src="/images/campus-hero.jpg"
                  alt="Modern university campus residential hall"
                  fill
                  priority
                  className="object-cover transition-transform duration-500 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                {/* Overlay Text on image */}
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <p className="text-xs font-semibold text-brand-200">
                    The Arbour Residential Complex
                  </p>
                  <p className="text-sm font-bold">Block A & B • Modern Living & Study Space</p>
                </div>
              </div>

              {/* Floating Stat Overlay 1: Live Occupancy */}
              <motion.div
                style={{
                  transform: !prefersReducedMotion
                    ? `translate3d(${mousePos.x * 12}px, ${mousePos.y * 12}px, 0)`
                    : "none",
                }}
                className="absolute -top-3 -left-3 z-20"
              >
                <GlassCard className="p-3.5 shadow-md border border-border/70 bg-surface/90 backdrop-blur-md rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Live Occupancy
                      </p>
                      <p className="font-heading text-sm font-bold text-foreground">
                        94.2% Capacity
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>

              {/* Floating Stat Overlay 2: Match Satisfaction */}
              <motion.div
                style={{
                  transform: !prefersReducedMotion
                    ? `translate3d(${mousePos.x * -12}px, ${mousePos.y * -12}px, 0)`
                    : "none",
                }}
                className="absolute -bottom-3 -right-3 z-20"
              >
                <GlassCard className="p-3.5 shadow-md border border-border/70 bg-surface/90 backdrop-blur-md rounded-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/40">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">
                        Roommate Match
                      </p>
                      <p className="font-heading text-sm font-bold text-foreground">
                        96.8% High Compatibility
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

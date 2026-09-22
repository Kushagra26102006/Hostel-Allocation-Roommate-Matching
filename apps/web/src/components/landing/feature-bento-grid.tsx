"use client";

import * as React from "react";
import {
  ListOrdered,
  Sparkles,
  Lock,
  QrCode,
  Scale,
  Smartphone,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/glass-card";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { getMessages } from "@/lib/i18n";

export function FeatureBentoGrid() {
  const { prefersReducedMotion } = useMotionPreference();
  const messages = getMessages();
  const copy = messages.features;

  const cardIcons: Record<
    string,
    React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  > = {
    "ranked-preferences": ListOrdered,
    "explainable-results": Sparkles,
    "private-by-design": Lock,
    "verified-letters": QrCode,
    "fair-and-audited": Scale,
    "works-on-your-phone": Smartphone,
  };

  return (
    <section
      id="features"
      aria-labelledby="features-heading"
      className="relative px-4 py-24 sm:px-6 lg:px-8 bg-surface/30 dark:bg-transparent"
    >
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <span>{copy.badge}</span>
          </div>
          <h2
            id="features-heading"
            className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl lg:text-5xl"
          >
            {copy.title}
          </h2>
          <p className="mt-4 text-base text-muted sm:text-lg">{copy.subtitle}</p>
        </div>

        {/* Bento Grid */}
        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {copy.cards.map((card, idx) => {
            const Icon = cardIcons[card.id] ?? Sparkles;
            const isLarge = idx === 0 || idx === 3;

            return (
              <GlassCard
                key={card.id}
                spotlight={!prefersReducedMotion}
                className={cn(
                  "group relative flex flex-col justify-between overflow-hidden rounded-card p-7",
                  "border border-border/80 bg-surface/70 shadow-lg backdrop-blur-md",
                  "transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-brand-300 dark:hover:border-brand-700",
                  isLarge && "sm:col-span-2 lg:col-span-2",
                )}
              >
                <div>
                  {/* Top Bar: Icon + Tag */}
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-gradient-brand group-hover:text-brand-foreground dark:bg-brand-950/60 dark:text-brand-400">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <span className="rounded-full border border-border/70 bg-surface/80 px-2.5 py-1 text-[11px] font-semibold text-muted">
                      {card.tag}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="mt-6 font-heading text-xl font-bold text-text">{card.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted">{card.description}</p>
                </div>

                {/* Bottom decorative preview */}
                <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4 text-xs font-semibold text-brand-600 dark:text-brand-400">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Production verified
                  </span>
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </section>
  );
}

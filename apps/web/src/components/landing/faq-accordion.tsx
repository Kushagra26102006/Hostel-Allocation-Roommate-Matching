"use client";

import * as React from "react";
import { HelpCircle, MessageCircleQuestion } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { GlassCard } from "@/components/glass-card";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { getMessages } from "@/lib/i18n";

export function FaqAccordion() {
  const { prefersReducedMotion } = useMotionPreference();
  const messages = getMessages();
  const copy = messages.faq;

  return (
    <section id="faq" aria-labelledby="faq-heading" className="relative px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Section Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
            <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{copy.badge}</span>
          </div>
          <h2
            id="faq-heading"
            className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl"
          >
            {copy.title}
          </h2>
          <p className="mt-3 text-base text-muted">{copy.subtitle}</p>
        </div>

        {/* Accordion Container */}
        <div className="mt-12">
          <GlassCard
            spotlight={!prefersReducedMotion}
            className="overflow-hidden border border-border/80 bg-surface/80 p-6 shadow-xl backdrop-blur-xl sm:p-8"
          >
            <Accordion type="single" collapsible defaultValue="eligibility" className="w-full">
              {copy.items.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="border-b border-border/60 py-1 last:border-none"
                >
                  <AccordionTrigger className="text-left font-heading text-base font-semibold text-text hover:text-brand-600 dark:hover:text-brand-400 sm:text-lg">
                    <span className="flex items-center gap-3">
                      <MessageCircleQuestion
                        className="h-5 w-5 text-brand-500 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{item.question}</span>
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="pl-8 text-sm leading-relaxed text-muted sm:text-base">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}

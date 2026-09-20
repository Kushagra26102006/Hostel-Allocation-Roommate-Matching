import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { LiveOccupancyStrip } from "@/components/landing/live-occupancy-strip";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureBentoGrid } from "@/components/landing/feature-bento-grid";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { LandingFooter } from "@/components/landing/footer";
import { GlassCard } from "@/components/glass-card";
import { Building } from "lucide-react";

export const metadata: Metadata = {
  title: "HostelHub — Fair & Transparent Campus Hostel Allocation",
  description:
    "Fair, explainable hostel allocation and roommate matching — reviewed by wardens, transparent to every student.",
};

const HOSTEL_TOWERS = [
  {
    id: "block-a",
    name: "Aryabhata Hall",
    subtitle: "Block A • Senior Undergraduates",
    capacity: "420 Beds",
    type: "Single & Double Rooms (Air Conditioned)",
    features: ["Dedicated High-speed Fiber", "24/7 Silent Study Lounges", "Elevator Access"],
    gender: "Men's Residence",
    tag: "94% Occupied",
  },
  {
    id: "block-b",
    name: "Gargi Residence",
    subtitle: "Block B • All Semesters",
    capacity: "380 Beds",
    type: "Single & Double Attached Baths",
    features: ["Courtyard Garden", "Fitness & Yoga Room", "Biometric Entry Control"],
    gender: "Women's Residence",
    tag: "94% Occupied",
  },
  {
    id: "block-c",
    name: "Ramanujan Tower",
    subtitle: "Block C • Postgrad & Scholars",
    capacity: "400 Beds",
    type: "Single Studio & Scholar Suites",
    features: ["Conference Pods", "Pantry On Each Floor", "Solar Heated Water"],
    gender: "Co-Ed Suites",
    tag: "90% Occupied",
  },
  {
    id: "block-d",
    name: "Kalpana Chawla Hall",
    subtitle: "Block D • Freshmen & Sophomores",
    capacity: "320 Beds",
    type: "Twin Sharing & Quad Suites",
    features: ["Activity Hall", "Music & Recreation Room", "Peer Tutoring Center"],
    gender: "Women's Residence",
    tag: "89% Occupied",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text selection:bg-brand-500/20 selection:text-brand-600">
      {/* 1. Sticky Glass Navbar */}
      <LandingNavbar />

      <main className="flex-1">
        {/* 2. Hero Section */}
        <LandingHero />

        {/* 3. Live Occupancy Strip */}
        <LiveOccupancyStrip />

        {/* 4. How It Works Section (4 Steps, Scroll-Driven) */}
        <HowItWorks />

        {/* Anchor for Hostels Showcase */}
        <section
          id="hostels"
          aria-labelledby="hostels-heading"
          className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-border/40"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-900/40 dark:text-brand-300">
                <Building className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Campus Living Spaces</span>
              </div>
              <h2
                id="hostels-heading"
                className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-text sm:text-4xl"
              >
                Explore residential towers
              </h2>
              <p className="mt-3 text-base text-muted sm:text-lg">
                Four modern hostel complexes configured for focused learning, community living, and security.
              </p>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOSTEL_TOWERS.map((tower) => (
                <GlassCard
                  key={tower.id}
                  className="flex flex-col justify-between border border-border/70 bg-surface/75 p-6 shadow-md transition-all duration-280 hover:-translate-y-1 hover:shadow-xl"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
                        {tower.gender}
                      </span>
                      <span className="text-xs font-semibold text-success">
                        {tower.tag}
                      </span>
                    </div>

                    <h3 className="mt-4 font-heading text-lg font-bold text-text">
                      {tower.name}
                    </h3>
                    <p className="text-xs font-medium text-muted">
                      {tower.subtitle}
                    </p>

                    <div className="mt-4 space-y-1.5 border-t border-border/50 pt-4 text-xs">
                      <div className="font-semibold text-text">{tower.type}</div>
                      <div className="text-muted">{tower.capacity}</div>
                    </div>

                    <ul className="mt-4 space-y-2 border-t border-border/50 pt-3 text-[11px] text-muted">
                      {tower.features.map((feat) => (
                        <li key={feat} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-6 border-t border-border/60 pt-4 text-center">
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400">
                      View room layouts & floor plan →
                    </span>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Feature Bento Grid (6 Cards) */}
        <FeatureBentoGrid />

        {/* 6. FAQ Accordion (4 questions) */}
        <FaqAccordion />
      </main>

      {/* 7. Semantic Footer */}
      <LandingFooter />
    </div>
  );
}

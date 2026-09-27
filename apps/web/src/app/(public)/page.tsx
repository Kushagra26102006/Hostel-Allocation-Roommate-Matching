import type { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/navbar";
import { LandingHero } from "@/components/landing/hero";
import { LiveOccupancyStrip } from "@/components/landing/live-occupancy-strip";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FeatureBentoGrid } from "@/components/landing/feature-bento-grid";
import { FaqAccordion } from "@/components/landing/faq-accordion";
import { LandingFooter } from "@/components/landing/footer";
import { SmartImage } from "@/components/ui/smart-image";
import { Building, ArrowRight } from "lucide-react";
import Link from "next/link";

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
    type: "Single & Double Rooms (AC)",
    features: ["Dedicated High-speed Fiber", "24/7 Silent Study Lounges", "Elevator Access"],
    gender: "Men's Residence",
    tag: "94% Occupied",
    image: "/images/campus-hero.jpg",
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
    image: "/images/residence-hall.jpg",
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
    image: "/images/study-lounge.jpg",
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
    image: "/images/room-interior.jpg",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-brand-500/15 selection:text-brand-600">
      {/* 1. Sticky Header Navbar */}
      <LandingNavbar />

      <main className="flex-1">
        {/* 2. Hero Section */}
        <LandingHero />

        {/* 3. Live Occupancy Strip */}
        <LiveOccupancyStrip />

        {/* 4. How It Works Section */}
        <HowItWorks />

        {/* Anchor for Hostels Showcase */}
        <section
          id="hostels"
          aria-labelledby="hostels-heading"
          className="relative px-4 py-20 sm:px-6 lg:px-8 border-t border-border/50"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-3xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-800 dark:bg-brand-950/40 dark:text-brand-300">
                <Building className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Campus Residential Complexes</span>
              </div>
              <h2
                id="hostels-heading"
                className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl"
              >
                Explore residential towers
              </h2>
              <p className="mt-3 text-base text-muted sm:text-lg">
                Four modern hostel complexes engineered for focused study, community living, and
                safety.
              </p>
            </div>

            <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {HOSTEL_TOWERS.map((tower) => (
                <div
                  key={tower.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-card border border-border/70 bg-surface shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-brand-500/40 hover:shadow-md"
                >
                  <div>
                    {/* Tower Image */}
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-muted">
                      <SmartImage
                        src={tower.image}
                        alt={tower.name}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-103"
                      />
                      <div className="absolute top-3 left-3">
                        <span className="rounded-md bg-surface/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-foreground border border-border/60 shadow-2xs">
                          {tower.gender}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3">
                        <span className="rounded-md bg-emerald-500 text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                          {tower.tag}
                        </span>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-heading text-base font-bold text-foreground">
                        {tower.name}
                      </h3>
                      <p className="text-xs font-medium text-muted mt-0.5">{tower.subtitle}</p>

                      <div className="mt-3.5 space-y-1 border-t border-border/50 pt-3 text-xs">
                        <div className="font-semibold text-foreground">{tower.type}</div>
                        <div className="text-muted">{tower.capacity}</div>
                      </div>

                      <ul className="mt-3 space-y-1.5 border-t border-border/50 pt-3 text-[11px] text-muted">
                        {tower.features.map((feat) => (
                          <li key={feat} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shrink-0" />
                            <span className="line-clamp-1">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="border-t border-border/60 p-4 pt-3 text-center bg-surface-muted/20">
                    <Link
                      href="/login"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:underline"
                    >
                      <span>Explore room configurations</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Feature Bento Grid */}
        <FeatureBentoGrid />

        {/* 6. FAQ Accordion */}
        <FaqAccordion />
      </main>

      {/* 7. Semantic Footer */}
      <LandingFooter />
    </div>
  );
}

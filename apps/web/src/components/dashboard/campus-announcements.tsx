"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock, ArrowRight, Pin } from "lucide-react";
import { GlassCard } from "@/components/glass-card";

interface Announcement {
  id: string;
  title: string;
  date: string;
  tag: string;
  summary: string;
  isNew?: boolean;
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    title: "Autumn 2026 Key Handover & Check-in Schedule",
    date: "Sep 20, 2026",
    tag: "Notice",
    summary:
      "Physical keys and biometric access activation for Towers A & B will be distributed at the North Gate Warden Office from 9:00 AM to 6:00 PM.",
    isNew: true,
  },
  {
    id: "ann-2",
    title: "High-Speed Campus Wi-Fi 6 & Gigabit LAN Activation",
    date: "Sep 19, 2026",
    tag: "Facility",
    summary:
      "Ethernet ports in rooms 301–340 have been provisioned for 1 Gbps direct gateway speed. Register your laptop MAC address on the captive portal.",
    isNew: false,
  },
  {
    id: "ann-3",
    title: "Mandatory Resident Safety & Fire Drill Briefing",
    date: "Sep 17, 2026",
    tag: "Welfare",
    summary:
      "Join the Chief Warden and Dean of Student Welfare for the annual residential orientation webinar on September 24 at 5:00 PM via Campus Teams.",
    isNew: false,
  },
];

const DEFAULT_TAG_STYLE = {
  bg: "bg-brand-500/10 dark:bg-brand-500/20",
  text: "text-brand-600 dark:text-brand-400",
  border: "border-brand-500/30",
};

const TAG_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Notice: DEFAULT_TAG_STYLE,
  Facility: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    text: "text-cyan-600 dark:text-cyan-400",
    border: "border-cyan-500/30",
  },
  Welfare: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
};

export function CampusAnnouncements() {
  const [selectedNotice, setSelectedNotice] = React.useState<Announcement | null>(null);

  return (
    <GlassCard className="p-6 border-border/80 shadow-lg">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-lg font-bold text-text">Campus Announcements</h3>
            <span className="flex h-2 w-2 rounded-full bg-brand-500" />
          </div>
          <p className="text-xs text-muted mt-0.5">
            Official residential circulars from the Chief Warden &amp; Estate Office
          </p>
        </div>

        <Link
          href="/notifications"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-colors self-start sm:self-auto"
        >
          <span>View All 14 Notices</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Grid of Announcement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {ANNOUNCEMENTS.map((ann) => {
          const tagTheme =
            ann.tag && TAG_STYLES[ann.tag] ? TAG_STYLES[ann.tag]! : DEFAULT_TAG_STYLE;

          return (
            <motion.div
              key={ann.id}
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border p-5 flex flex-col justify-between transition-all duration-200 bg-surface/70 hover:shadow-md hover:border-brand-500/60 relative overflow-hidden ${
                ann.isNew
                  ? "border-brand-500/40 ring-1 ring-brand-500/20 shadow-xs"
                  : "border-border/70"
              }`}
            >
              {/* Subtle Highlight for New Notice */}
              {ann.isNew && (
                <div className="absolute top-0 right-0 h-10 w-10 overflow-hidden">
                  <div className="absolute transform rotate-45 bg-gradient-to-r from-brand-600 to-cyan-500 text-white text-[9px] font-bold py-0.5 right-[-24px] top-[8px] w-[80px] text-center shadow-xs">
                    NEW
                  </div>
                </div>
              )}

              <div>
                {/* Meta Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tagTheme.bg} ${tagTheme.text} ${tagTheme.border}`}
                  >
                    {ann.tag}
                  </span>

                  <span className="text-[11px] text-muted flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3 text-muted/70" />
                    <span>{ann.date}</span>
                  </span>
                </div>

                {/* Title & Body */}
                <h4 className="font-heading text-sm font-bold text-text line-clamp-2 leading-snug">
                  {ann.title}
                </h4>
                <p className="mt-2 text-xs text-muted line-clamp-3 leading-relaxed">
                  {ann.summary}
                </p>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedNotice(ann)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-colors group/link"
                >
                  <span>Read Full Notice</span>
                  <ArrowRight className="h-3 w-3 transition-transform group-hover/link:translate-x-1" />
                </button>
                <Pin className="h-3.5 w-3.5 text-muted/40" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Notice Reader Dialog */}
      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setSelectedNotice(null)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-surface/98 p-6 shadow-2xl backdrop-blur-2xl text-text z-10"
          >
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <span className="rounded-md bg-brand-500/10 px-2.5 py-0.5 text-xs font-bold text-brand-600 dark:text-brand-400">
                {selectedNotice.tag}
              </span>
              <span className="text-xs text-muted">{selectedNotice.date}</span>
            </div>

            <h3 className="font-heading text-lg font-bold text-text mb-3">
              {selectedNotice.title}
            </h3>

            <p className="text-xs text-muted leading-relaxed mb-6">{selectedNotice.summary}</p>

            <div className="rounded-xl border border-border/60 bg-muted/5 p-3 text-[11px] text-muted mb-6">
              Issued under authorization of Dr. S. K. Roy (Chief Warden, Campus Residences).
              Compliance with residential timelines is mandatory.
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedNotice(null)}
                className="rounded-xl bg-brand-600 hover:bg-brand-500 px-4 py-2 text-xs font-semibold text-white transition-colors"
              >
                Close Notice
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </GlassCard>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  MapPin,
  Wind,
  Wifi,
  Bed,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { GlassCard } from "@/components/glass-card";

interface RoomShowcaseCardProps {
  student: {
    hostel: string;
    tower: string;
    floor: string;
    room: string;
    bed: string;
    roomType: string;
  };
}

const AMENITIES = [
  {
    id: "ac",
    icon: Wind,
    name: "Air Conditioned",
    spec: "22°C Climate Ctrl",
    color: "text-cyan-500",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/30",
    tooltip: "Individual inverter HVAC unit with auto-eco night mode",
  },
  {
    id: "lan",
    icon: Wifi,
    name: "Gigabit LAN",
    spec: "Port A-304-1 • 1 Gbps",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    tooltip: "Dedicated Cat-6 Ethernet drop + 802.11ax campus Wi-Fi 6",
  },
  {
    id: "window",
    icon: Bed,
    name: "Window View",
    spec: "Garden Courtyard East",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    tooltip: "East-facing double-glazed window with morning sunlight",
  },
  {
    id: "biometric",
    icon: ShieldCheck,
    name: "Biometric Lock",
    spec: "Keycard RFID Ready",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
    border: "border-violet-500/30",
    tooltip: "NFC smart lock integrated with student university card",
  },
];

export function RoomShowcaseCard({ student }: RoomShowcaseCardProps) {
  const [activeTooltip, setActiveTooltip] = React.useState<string | null>(null);

  return (
    <GlassCard className="group overflow-hidden p-0 border-border/80 shadow-lg flex flex-col justify-between h-full">
      <div>
        {/* Visual Hero Header with Realistic Room Imagery & Gradient Overlays */}
        <div className="relative h-60 w-full overflow-hidden bg-slate-900">
          <Image
            src="/images/modern_dorm_room.jpg"
            alt="Aryabhata Hall Allocated Student Room"
            fill
            priority
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* Dual Gradient Overlay for readable text and contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent dark:from-surface dark:via-surface/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/50 via-transparent to-transparent" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md border border-white/20 shadow-md">
              <MapPin className="h-3.5 w-3.5 text-cyan-400" />
              <span>{student.hostel}</span>
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 px-3 py-1 text-xs font-bold text-white backdrop-blur-md shadow-md shadow-emerald-900/40">
              <CheckCircle2 className="h-3.5 w-3.5" />
              ALLOCATED
            </span>
          </div>

          {/* Bottom Title on Image */}
          <div className="absolute bottom-4 left-4 right-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 drop-shadow-sm">
              {student.tower} • {student.floor}
            </span>
            <h3 className="font-heading text-2xl sm:text-3xl font-black text-text tracking-tight drop-shadow-md">
              Room {student.room} —{" "}
              <span className="text-brand-600 dark:text-brand-400">{student.bed}</span>
            </h3>
            <p className="text-xs text-muted font-medium mt-0.5">{student.roomType}</p>
          </div>
        </div>

        {/* Room Interactive Amenities Grid */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">
              Room Amenities &amp; Hardware
            </span>
            <span className="text-[10px] text-muted">Hover for tech specs</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {AMENITIES.map((item) => {
              const Icon = item.icon;
              const isHovered = activeTooltip === item.id;

              return (
                <div
                  key={item.id}
                  onMouseEnter={() => setActiveTooltip(item.id)}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className={`relative rounded-2xl border p-3 transition-all duration-200 cursor-pointer ${
                    item.border
                  } ${item.bg} hover:-translate-y-1 hover:shadow-md hover:border-brand-500`}
                >
                  <motion.div
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-center mb-1.5"
                  >
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </motion.div>
                  <span className="block text-center text-xs font-bold text-text truncate">
                    {item.name}
                  </span>
                  <span className="block text-center text-[10px] text-muted truncate mt-0.5">
                    {item.spec}
                  </span>

                  {/* Micro Tooltip */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="absolute -top-14 left-1/2 -translate-x-1/2 z-30 w-44 rounded-xl border border-border/80 bg-surface/98 p-2 text-center text-[10px] text-text shadow-xl backdrop-blur-xl pointer-events-none"
                    >
                      <p className="leading-snug font-medium">{item.tooltip}</p>
                      <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 h-2 w-2 rotate-45 border-b border-r border-border/80 bg-surface" />
                    </motion.div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer CTA Link to /room */}
      <div className="border-t border-border/50 px-6 py-4 bg-muted/5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted">
          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
          <span>Biometric key card distribution starts Sep 25</span>
        </div>
        <Link
          href="/room"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-colors group/link"
        >
          <span>View Room Layouts &amp; Floor Plan</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
        </Link>
      </div>
    </GlassCard>
  );
}

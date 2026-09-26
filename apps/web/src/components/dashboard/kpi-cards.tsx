"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle2, Users, Building, CreditCard, ArrowUpRight } from "lucide-react";

interface KpiCardsProps {
  student: {
    status: string;
    room: string;
    bed: string;
    compatibility: number;
    roommate: string;
    hostel: string;
    tower: string;
    floor: string;
  };
}

export function AnimatedKpiCards({ student }: KpiCardsProps) {
  const cards = [
    {
      title: "Allocation Status",
      badge: "VERIFIED",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      value: "Allocated",
      sub: `Room ${student.room} • ${student.bed}`,
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      glowBorder: "hover:border-emerald-500/50",
      href: "/room",
    },
    {
      title: "Roommate Match",
      badge: "MCDA SCORE",
      badgeColor: "bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20",
      value: `${student.compatibility}% Match`,
      sub: `Matched with ${student.roommate}`,
      icon: Users,
      iconColor: "text-brand-500",
      iconBg: "bg-brand-500/10",
      gradient: "from-brand-500/10 via-brand-500/5 to-transparent",
      glowBorder: "hover:border-brand-500/50",
      href: "/roommate",
    },
    {
      title: "Hostel & Room",
      badge: "AUTUMN '26",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      value: "Aryabhata",
      sub: `${student.tower} • ${student.floor} (AC)`,
      icon: Building,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      gradient: "from-blue-500/10 via-blue-500/5 to-transparent",
      glowBorder: "hover:border-blue-500/50",
      href: "/room",
    },
    {
      title: "Semester Fee Status",
      badge: "DUES ZERO",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      value: "Cleared",
      sub: "Receipt #NIT-2026-FEE-409",
      icon: CreditCard,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      gradient: "from-emerald-500/10 via-emerald-500/5 to-transparent",
      glowBorder: "hover:border-emerald-500/50",
      href: "/payments",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;

        return (
          <Link key={c.title} href={c.href} className="group block focus:outline-none">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.08 }}
              whileHover={{ y: -4 }}
              className={`relative overflow-hidden rounded-2xl border border-border/80 bg-surface/75 p-5 shadow-xs transition-all duration-300 ${c.glowBorder} hover:shadow-lg`}
            >
              {/* Dynamic Subtle Gradient Background on Hover */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100 pointer-events-none`}
              />

              {/* Card Header: Category + Icon */}
              <div className="relative flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block">
                    {c.title}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-md border px-1.5 py-0.2 text-[9px] font-bold uppercase mt-1 ${c.badgeColor}`}
                  >
                    {c.badge}
                  </span>
                </div>

                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.iconBg} ${c.iconColor} transition-transform duration-300 group-hover:scale-110 shadow-xs`}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              {/* Main Metric Value & Supporting Note */}
              <div className="relative mt-4 flex items-end justify-between">
                <div>
                  <div className="font-heading text-2xl font-black tracking-tight text-text leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
                    {c.value}
                  </div>
                  <p className="text-xs text-muted font-medium mt-1 truncate max-w-[200px]">
                    {c.sub}
                  </p>
                </div>

                <ArrowUpRight className="h-4 w-4 text-muted/50 transition-all duration-200 group-hover:text-brand-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </motion.div>
          </Link>
        );
      })}
    </div>
  );
}

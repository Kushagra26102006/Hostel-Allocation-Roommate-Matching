"use client";

import * as React from "react";
import Link from "next/link";
import { Bed, Users, Wrench, CreditCard, QrCode, ChevronRight, Sparkles } from "lucide-react";
import { GlassCard } from "@/components/glass-card";

interface QuickActionsCardProps {
  onOpenGatePass: () => void;
}

export function QuickActionsCard({ onOpenGatePass }: QuickActionsCardProps) {
  const actions = [
    {
      title: "Room & Bed Details",
      desc: "Room floor plans, hardware inventory & 3D specs",
      href: "/room",
      icon: Bed,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      borderHover: "hover:border-blue-500/40",
      isModal: false,
    },
    {
      title: "Roommate Matching",
      desc: "Compatibility matrix & lifestyle preferences",
      href: "/roommate",
      icon: Users,
      color: "text-brand-500",
      bg: "bg-brand-500/10",
      borderHover: "hover:border-brand-500/40",
      isModal: false,
    },
    {
      title: "Maintenance & Helpdesk",
      desc: "Report electrical, plumbing, or Wi-Fi faults",
      href: "/complaints",
      icon: Wrench,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      borderHover: "hover:border-amber-500/40",
      isModal: false,
    },
    {
      title: "Fee Payments & Invoices",
      desc: "Hostel mess bills, deposit & receipts",
      href: "/payments",
      icon: CreditCard,
      color: "text-emerald-500",
      bg: "bg-emerald-500/10",
      borderHover: "hover:border-emerald-500/40",
      isModal: false,
    },
    {
      title: "Digital QR Gate Pass",
      desc: "Instant barcode permit for campus turnstiles",
      href: "#",
      icon: QrCode,
      color: "text-cyan-500",
      bg: "bg-cyan-500/10",
      borderHover: "hover:border-cyan-500/40",
      isModal: true,
    },
  ];

  return (
    <GlassCard className="p-6 border-border/80 shadow-lg flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading text-lg font-bold text-text">Resident Quick Actions</h3>
            <p className="text-xs text-muted">Frequently accessed campus services &amp; tools</p>
          </div>
          <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>

        <div className="space-y-2.5">
          {actions.map((act) => {
            const Icon = act.icon;

            const inner = (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${act.bg} ${act.color} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-xs`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="truncate text-left">
                    <span className="block text-xs font-bold text-text transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400">
                      {act.title}
                    </span>
                    <p className="text-[11px] text-muted truncate mt-0.5">{act.desc}</p>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand-500" />
              </div>
            );

            if (act.isModal) {
              return (
                <button
                  key={act.title}
                  type="button"
                  onClick={onOpenGatePass}
                  className={`w-full flex items-center rounded-2xl border border-border/60 bg-surface/60 p-3 hover:bg-brand-50/40 dark:hover:bg-brand-900/20 transition-all duration-200 shadow-xs group cursor-pointer ${act.borderHover}`}
                >
                  {inner}
                </button>
              );
            }

            return (
              <Link
                key={act.title}
                href={act.href}
                className={`flex items-center rounded-2xl border border-border/60 bg-surface/60 p-3 hover:bg-brand-50/40 dark:hover:bg-brand-900/20 transition-all duration-200 shadow-xs group ${act.borderHover}`}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Emergency Helpline Strip */}
      <div className="mt-5 rounded-2xl border border-brand-500/20 bg-gradient-to-r from-brand-500/10 via-indigo-500/10 to-cyan-500/10 p-3.5 text-center">
        <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-brand-700 dark:text-brand-300">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Warden Emergency Desk: 1800-NIT-HOSTEL</span>
        </div>
        <p className="text-[10px] text-muted mt-0.5">24/7 Campus Medical &amp; Security Dispatch</p>
      </div>
    </GlassCard>
  );
}

"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

export default function SysAdminRolesPage() {
  const roles = [
    { name: "Student", desc: "Submit preferences, view match, request room change", users: 1970 },
    {
      name: "Hostel Warden",
      desc: "Manage assigned hostel roster, verify medical priority, sign-off draft",
      users: 5,
    },
    {
      name: "Chief Warden",
      desc: "Approve university-wide drafts, execute publication, resolve appeals",
      users: 1,
    },
    {
      name: "Hostel Admin",
      desc: "Physical inventory, bed management, bulk CSV import, check-in",
      users: 8,
    },
    {
      name: "Dean Student Welfare",
      desc: "Executive read-only analytics, policy governance, equity oversight",
      users: 2,
    },
    {
      name: "System Admin",
      desc: "Full root access, RBAC, algorithm parameters, audit logs",
      users: 2,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Role-Based Access Control</span>
        </div>
        <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
          Roles & Permission Matrix
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
          Enforce strict backend authorization boundaries across all 6 campus roles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((r, i) => (
          <GlassCard key={i} className="p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-heading text-base font-bold text-foreground">{r.name}</h3>
                <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                  {r.users} Active
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
            </div>

            <Button size="sm" variant="outline" className="mt-4 w-full rounded-xl text-xs">
              Configure Permissions
            </Button>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

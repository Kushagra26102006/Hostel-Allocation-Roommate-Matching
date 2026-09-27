"use client";

import * as React from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { FilterBar } from "@/components/ui/filter-bar";
import { Users, Plus, Lock } from "lucide-react";
import { toast } from "sonner";

export default function SysAdminUsersPage() {
  const [searchQuery, setSearchQuery] = React.useState("");

  const users = [
    {
      name: "Aarav Sharma",
      email: "aarav.sharma@campus.edu",
      role: "Student",
      status: "Active",
      mfa: "Disabled",
    },
    {
      name: "Prof. S. R. Kulkarni",
      email: "s.kulkarni@campus.edu",
      role: "Hostel Warden",
      status: "Active",
      mfa: "TOTP Enrolled",
    },
    {
      name: "Dr. Meenakshi Sundaram",
      email: "m.sundaram@campus.edu",
      role: "Chief Warden",
      status: "Active",
      mfa: "TOTP Enrolled",
    },
    {
      name: "Prof. Vikram Joshi",
      email: "dean.welfare@campus.edu",
      role: "Dean Student Welfare",
      status: "Active",
      mfa: "TOTP Enrolled",
    },
    {
      name: "Kushagra (Root)",
      email: "admin.root@campus.edu",
      role: "System Admin",
      status: "Active",
      mfa: "TOTP Enrolled",
    },
  ];

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-surface-muted px-3 py-1 text-xs font-semibold text-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>Identity Directory</span>
          </div>
          <h1 className="mt-2 font-heading text-2xl font-bold sm:text-3xl">
            Campus User Directory
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Manage institutional users, role assignments, and multi-factor authentication statuses.
          </p>
        </div>

        <Button onClick={() => toast.info("User invitation modal opened")} className="rounded-xl">
          <Plus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      <FilterBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

      <GlassCard className="overflow-hidden p-0">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-border/60 bg-surface-muted/60 text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
            <tr>
              <th className="p-3.5 pl-4">User</th>
              <th className="p-3.5">Assigned Role</th>
              <th className="p-3.5">MFA Security</th>
              <th className="p-3.5">Account Status</th>
              <th className="p-3.5 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {filteredUsers.map((u, i) => (
              <tr key={i} className="hover:bg-surface-muted/40 transition-colors">
                <td className="p-3.5 pl-4">
                  <div className="font-bold text-foreground">{u.name}</div>
                  <div className="text-[11px] text-muted-foreground">{u.email}</div>
                </td>
                <td className="p-3.5 font-semibold text-foreground">{u.role}</td>
                <td className="p-3.5">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${u.mfa.includes("TOTP") ? "bg-emerald-500/10 text-emerald-600" : "bg-surface-muted text-muted-foreground"}`}
                  >
                    <Lock className="h-3 w-3" />
                    {u.mfa}
                  </span>
                </td>
                <td className="p-3.5">
                  <StatusBadge status="approved" label={u.status} />
                </td>
                <td className="p-3.5 pr-4 text-right">
                  <Button size="sm" variant="ghost" className="h-8 text-xs">
                    Edit Permissions
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}

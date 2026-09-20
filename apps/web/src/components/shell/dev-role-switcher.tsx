"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserCog } from "lucide-react";
import { useRoleStore, ROLES_METADATA, type Role } from "@/stores/role-store";
import { useMessages } from "@/lib/i18n";

export function DevRoleSwitcher() {
  const { role, setRole } = useRoleStore();
  const router = useRouter();
  const messages = useMessages();
  const [open, setOpen] = React.useState(false);

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    setOpen(false);
    const targetUrl = ROLES_METADATA[newRole].portalPrefix;
    router.push(targetUrl);
  };

  const roleEntries = Object.entries(ROLES_METADATA) as [Role, (typeof ROLES_METADATA)[Role]][];

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={messages.shell.switchRole}
          aria-expanded={open}
          className="group flex items-center gap-2 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 transition-all hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="hidden sm:inline font-mono tracking-wider text-[11px] uppercase">
            {messages.shell.devRoleSwitcher}:
          </span>
          <span className="font-bold text-text">{ROLES_METADATA[role]?.name ?? role}</span>
          <UserCog className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 group-hover:rotate-12 transition-transform" />
        </button>
      </div>

      {open && (
        <div
          role="dialog"
          aria-label="Dev Role Selector"
          className="absolute right-0 top-full mt-2 w-72 rounded-card border border-border bg-surface p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95"
        >
          <div className="border-b border-border/70 pb-2 px-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 font-mono">
                [DEV ROLE SIMULATOR]
              </span>
              <span className="text-[10px] text-muted">Dev-only</span>
            </div>
            <p className="mt-1 text-[11px] text-muted leading-tight">
              {messages.shell.devRoleNotice}
            </p>
          </div>

          <div className="mt-1 space-y-1">
            {roleEntries.map(([rKey, info]) => {
              const isSelected = rKey === role;
              return (
                <button
                  key={rKey}
                  type="button"
                  onClick={() => handleRoleChange(rKey)}
                  className={`flex w-full flex-col rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? "bg-brand-50 text-brand-700 font-bold dark:bg-brand-900/40 dark:text-brand-300"
                      : "text-text hover:bg-surface/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{info.name}</span>
                    {isSelected && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                  </div>
                  <span className="text-[10px] text-muted mt-0.5 line-clamp-1">
                    {info.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

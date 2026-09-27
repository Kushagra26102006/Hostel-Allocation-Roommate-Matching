"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { UserCog, Loader2 } from "lucide-react";
import { useRoleStore, ROLES_METADATA, type Role } from "@/stores/role-store";
import { useMessages } from "@/lib/i18n";

const ROLE_DEMO_EMAILS: Record<Role, string> = {
  student: "student.demo@nit.edu",
  warden: "warden.demo@nit.edu",
  chief_warden: "chief.warden@nit.edu",
  hostel_admin: "admin.hostel@nit.edu",
  dean: "dean.welfare@nit.edu",
  sys_admin: "sysadmin@nit.edu",
};

export function DevRoleSwitcher() {
  const { role, setRole } = useRoleStore();
  const router = useRouter();
  const messages = useMessages();
  const [open, setOpen] = React.useState(false);
  const [switching, setSwitching] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleRoleChange = async (newRole: Role) => {
    setRole(newRole);
    setOpen(false);
    setSwitching(true);

    const targetUrl = ROLES_METADATA[newRole].portalPrefix;
    const demoEmail = ROLE_DEMO_EMAILS[newRole];

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: demoEmail,
        password: "HostelHub2026!MasterPass",
        turnstileToken: "1x00000000000000000000AA-test",
      });

      if (!res?.error) {
        if (newRole !== "student") {
          try {
            await fetch("/api/mfa/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token: "123456" }),
            });
          } catch {
            // Ignore if already verified
          }
        }
      }
      window.location.href = targetUrl;
    } catch {
      router.push(targetUrl);
    } finally {
      setSwitching(false);
    }
  };

  const roleEntries = Object.entries(ROLES_METADATA) as [Role, (typeof ROLES_METADATA)[Role]][];

  if (!mounted) {
    return (
      <div className="relative inline-block text-left shrink-0">
        <div className="flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-500" />
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80 whitespace-nowrap">
            DEV:
          </span>
          <span className="font-bold text-foreground whitespace-nowrap">Student</span>
          <UserCog className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative inline-block text-left shrink-0">
      <button
        type="button"
        disabled={switching}
        onClick={() => setOpen((prev) => !prev)}
        aria-label={messages.shell.switchRole}
        aria-expanded={open}
        className="group flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-amber-500/40 bg-amber-500/10 px-3 text-xs font-semibold text-amber-700 dark:text-amber-300 transition-all hover:bg-amber-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 disabled:opacity-50"
      >
        {switching ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-600" />
        ) : (
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
        )}
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-700/80 dark:text-amber-300/80 whitespace-nowrap">
          DEV:
        </span>
        <span className="font-bold text-foreground whitespace-nowrap">
          {switching ? "Switching..." : (ROLES_METADATA[role]?.name ?? role)}
        </span>
        <UserCog className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400 group-hover:rotate-12 transition-transform" />
      </button>

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

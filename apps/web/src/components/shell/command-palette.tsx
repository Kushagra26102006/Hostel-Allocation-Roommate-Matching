"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Search,
  Sun,
  Moon,
  Laptop,
  Globe,
  UserCog,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRoleStore, ROLES_METADATA, type Role } from "@/stores/role-store";
import { useLocaleStore } from "@/stores/locale-store";
import { getNavigationForRole } from "@/config/navigation";
import { useMessages } from "@/lib/i18n";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const { role, setRole } = useRoleStore();
  const { setLocale } = useLocaleStore();
  const messages = useMessages();

  // Keyboard shortcut listener: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const roleNavItems = getNavigationForRole(role);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-ctrl border border-border/80 bg-surface/60 px-3 py-1.5 text-xs text-muted transition-colors hover:bg-surface hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={messages.shell.openCommandPalette}
      >
        <Search className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="hidden md:inline">{messages.shell.searchPlaceholder}</span>
        <span className="inline md:hidden">Search</span>
        <kbd className="hidden sm:inline-flex rounded border border-border bg-muted/20 px-1.5 py-0.5 font-mono text-[10px] text-muted">
          {messages.shell.commandShortcut}
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={messages.shell.searchPlaceholder} />
        <CommandList>
          <CommandEmpty>{messages.shell.palette.noResults}</CommandEmpty>

          {/* Navigation Group (filtered by current role) */}
          <CommandGroup heading={messages.shell.palette.navigationGroup}>
            {roleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.id}
                  onSelect={() => runCommand(() => router.push(item.href))}
                >
                  <Icon className="mr-2 h-4 w-4 text-brand-500" />
                  <div className="flex flex-col">
                    <span>{item.fallbackTitle}</span>
                    <span className="text-[10px] text-muted">{item.description}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>

          <CommandSeparator />

          {/* Appearance / Theme Group */}
          <CommandGroup heading={messages.shell.palette.themeGroup}>
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <Sun className="mr-2 h-4 w-4 text-warning" />
              <span>{messages.common.themeLight}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <Moon className="mr-2 h-4 w-4 text-accent" />
              <span>{messages.common.themeDark}</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <Laptop className="mr-2 h-4 w-4 text-muted" />
              <span>{messages.common.themeSystem}</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Language Group */}
          <CommandGroup heading={messages.shell.palette.languageGroup}>
            <CommandItem onSelect={() => runCommand(() => setLocale("en"))}>
              <Globe className="mr-2 h-4 w-4 text-brand-500" />
              <span>English (en)</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setLocale("hi"))}>
              <Globe className="mr-2 h-4 w-4 text-brand-500" />
              <span>हिन्दी (Hindi)</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setLocale("pa"))}>
              <Globe className="mr-2 h-4 w-4 text-brand-500" />
              <span>ਪੰਜਾਬੀ (Punjabi)</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Dev Role Switcher Group */}
          <CommandGroup heading={messages.shell.palette.roleGroup}>
            {(Object.entries(ROLES_METADATA) as [Role, typeof ROLES_METADATA[Role]][]).map(
              ([rKey, info]) => (
                <CommandItem
                  key={rKey}
                  onSelect={() =>
                    runCommand(() => {
                      setRole(rKey);
                      router.push(info.portalPrefix);
                    })
                  }
                >
                  <UserCog className="mr-2 h-4 w-4 text-amber-500" />
                  <div className="flex flex-col">
                    <span className="font-semibold">
                      {info.name} {rKey === role ? "(Active)" : ""}
                    </span>
                    <span className="text-[10px] text-muted">{info.description}</span>
                  </div>
                </CommandItem>
              ),
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

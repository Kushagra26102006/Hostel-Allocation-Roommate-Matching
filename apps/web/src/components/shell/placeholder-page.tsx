"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Users,
  LayoutDashboard,
  BedDouble,
  AlertCircle,
  CreditCard,
  Building,
  KeyRound,
  FileSpreadsheet,
  Scale,
  Activity,
  History,
  QrCode,
  Sliders,
  Server,
  UserCog,
  FileClock,
  ClipboardCheck,
  Shield,
  HelpCircle,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { useMessages } from "@/lib/i18n";

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Users,
  LayoutDashboard,
  BedDouble,
  AlertCircle,
  CreditCard,
  Building,
  KeyRound,
  FileSpreadsheet,
  Scale,
  Activity,
  History,
  QrCode,
  Sliders,
  Server,
  UserCog,
  FileClock,
  ClipboardCheck,
  Shield,
  HelpCircle,
  // Navigation item id aliases
  "student-dashboard": LayoutDashboard,
  "student-applications": FileText,
  "student-room": BedDouble,
  "student-roommate": Users,
  "student-complaints": AlertCircle,
  "student-payments": CreditCard,
  "warden-overview": LayoutDashboard,
  "warden-allotments": ClipboardCheck,
  "warden-students": Users,
  "warden-complaints": AlertCircle,
  "warden-leaves": FileClock,
  "chief-overview": LayoutDashboard,
  "chief-allocations": Sliders,
  "chief-inventory": Building,
  "chief-appeals": Scale,
  "chief-wardens": Shield,
  "admin-inventory": Building,
  "admin-rooms": KeyRound,
  "admin-maintenance": AlertCircle,
  "admin-check-in": QrCode,
  "dean-overview": LayoutDashboard,
  "dean-policies": Scale,
  "dean-audit": Activity,
  "sys-overview": Server,
  "sys-institutions": Building,
  "sys-roles": UserCog,
  "sys-audit": History,
};

interface PlaceholderPageProps {
  title: string;
  description: string;
  iconName?: string;
  icon?: LucideIcon;
  badge?: string | undefined;
}

export function PlaceholderPage({
  title,
  description,
  iconName,
  icon,
  badge,
}: PlaceholderPageProps) {
  const messages = useMessages();
  const [simulatedCount, setSimulatedCount] = React.useState(0);

  const IconComponent = (iconName ? ICON_MAP[iconName] : undefined) || icon || LayoutDashboard;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <PageHeader
        title={title}
        description={description}
        actions={
          badge ? (
            <span className="inline-flex items-center rounded-full bg-brand-100 dark:bg-brand-900/40 px-3 py-1 text-xs font-semibold text-brand-700 dark:text-brand-300">
              {badge}
            </span>
          ) : undefined
        }
      />

      <div className="flex-1 p-6 md:p-8 flex items-center justify-center">
        <EmptyState
          icon={<IconComponent className="h-8 w-8 text-brand-600 dark:text-brand-400" />}
          title={title}
          description={description}
          action={{
            label:
              simulatedCount > 0 ? `Simulated ${simulatedCount}x` : messages.common.emptyAction,
            onClick: () => setSimulatedCount((prev) => prev + 1),
          }}
          className="max-w-md w-full"
        />
      </div>
    </div>
  );
}

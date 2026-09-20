import * as React from "react";
import { StaffSidebar } from "@/components/shell/staff-sidebar";
import { ShellHeader } from "@/components/shell/shell-header";
import { PageTransition } from "@/components/shell/page-transition";

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-background text-text">
      {/* Collapsible Glass Sidebar */}
      <StaffSidebar />

      {/* Main Column */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <ShellHeader showLogo={false} />
        <main className="flex-1 overflow-y-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

import * as React from "react";
import { ShellHeader } from "@/components/shell/shell-header";
import { StudentBottomBar } from "@/components/shell/student-bottom-bar";
import { PageTransition } from "@/components/shell/page-transition";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-text">
      {/* Student Top Bar */}
      <ShellHeader showLogo={true} />

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-8">
        <PageTransition>{children}</PageTransition>
      </main>

      {/* Mobile-only Bottom Tab Bar */}
      <StudentBottomBar />
    </div>
  );
}

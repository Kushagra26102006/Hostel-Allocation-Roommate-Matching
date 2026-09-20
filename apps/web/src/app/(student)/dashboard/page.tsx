import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = {
  title: "Student Dashboard — HostelHub",
  description: "View room allotment status, applications, and announcements.",
};

export default function StudentDashboardPage() {
  return (
    <PlaceholderPage
      title="Student Housing Dashboard"
      description="Welcome to your campus residence portal. Track room allocation progress, roommate questionnaires, and digital gate passes."
      iconName="LayoutDashboard"
      badge="Active Semester"
    />
  );
}

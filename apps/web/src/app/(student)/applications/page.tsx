import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = {
  title: "My Applications — HostelHub",
  description: "Manage hostel preferences, roommate questionnaire, and special appeals.",
};

export default function StudentApplicationsPage() {
  return (
    <PlaceholderPage
      title="My Housing Applications"
      description="Submit and review your hostel preferences, roommate lifestyle questionnaire, and medical accommodation requests."
      iconName="FileText"
      badge="Application Open"
    />
  );
}

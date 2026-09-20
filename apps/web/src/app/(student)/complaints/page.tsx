import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = {
  title: "Complaints & Maintenance — HostelHub",
  description: "Lodge and track hostel maintenance work orders, plumbing, and electrical repairs.",
};

export default function StudentComplaintsPage() {
  return (
    <PlaceholderPage
      title="Complaints & Maintenance"
      description="Report hostel room repairs, housekeeping requests, and electrical issues with real-time resolution SLAs."
      iconName="AlertCircle"
      badge="24h Turnaround"
    />
  );
}

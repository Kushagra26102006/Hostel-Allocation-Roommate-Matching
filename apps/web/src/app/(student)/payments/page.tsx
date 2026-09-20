import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = {
  title: "Payments & Dues — HostelHub",
  description: "View semester hostel rent, mess security deposits, and download payment receipts.",
};

export default function StudentPaymentsPage() {
  return (
    <PlaceholderPage
      title="Payments & Fee Dues"
      description="Review semester hostel fees, electricity surcharges, mess security deposits, and verified transaction receipts."
      iconName="CreditCard"
      badge="All Dues Cleared"
    />
  );
}

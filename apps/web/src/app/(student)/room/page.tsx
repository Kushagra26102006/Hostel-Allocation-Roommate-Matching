import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = {
  title: "Room & Allotment — HostelHub",
  description: "View verified allotment certificate, room amenities, and check-in QR pass.",
};

export default function StudentRoomPage() {
  return (
    <PlaceholderPage
      title="Room & Allotment"
      description="Access your cryptographically signed allotment letter, room inventory checklist, and digital security gate pass."
      iconName="BedDouble"
      badge="Block B • Room 304"
    />
  );
}

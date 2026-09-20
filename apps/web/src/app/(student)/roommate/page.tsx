import type { Metadata } from "next";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

export const metadata: Metadata = {
  title: "Roommate Matching — HostelHub",
  description: "View roommate compatibility vectors, chronotype alignments, and mutual pairings.",
};

export default function StudentRoommatePage() {
  return (
    <PlaceholderPage
      title="Roommate Matching Engine"
      description="Review Gale-Shapley compatibility scores, mutual roommate requests, and shared lifestyle preferences."
      iconName="Users"
      badge="98.4% Match"
    />
  );
}

import React from "react";
import { PreferenceRanker, type HostelCardData } from "@/components/preferences/preference-ranker";
import { GroupBuilder } from "@/components/preferences/group-builder";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const metadata = {
  title: "Hostel Preferences & Roommate Groups | HostelHub",
  description: "Rank hostel preferences and form roommate groups.",
};

const SAMPLE_HOSTELS: HostelCardData[] = [
  {
    id: "h_tagore",
    name: "Rabindranath Tagore Hostel",
    roomType: "double",
    ac: true,
    walkingTimeMin: 5,
    availabilityHint: "High demand • 42 beds remaining",
    photoUrl: "",
  },
  {
    id: "h_kalam",
    name: "APJ Abdul Kalam Hostel",
    roomType: "single",
    ac: true,
    walkingTimeMin: 8,
    availabilityHint: "Moderate demand • 18 beds remaining",
    photoUrl: "",
  },
  {
    id: "h_raman",
    name: "CV Raman Science Hostel",
    roomType: "double",
    ac: false,
    walkingTimeMin: 12,
    availabilityHint: "Available • 65 beds remaining",
    photoUrl: "",
  },
  {
    id: "h_sarojini",
    name: "Sarojini Naidu Girls Hostel",
    roomType: "triple",
    ac: false,
    walkingTimeMin: 6,
    availabilityHint: "High demand • 30 beds remaining",
    photoUrl: "",
  },
];

export default async function PreferencesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      <Tabs defaultValue="ranking" className="w-full max-w-4xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 mb-8">
          <TabsTrigger value="ranking">1. Rank Hostel Preferences</TabsTrigger>
          <TabsTrigger value="group">2. Roommate Group Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking">
          <PreferenceRanker applicationId={id} initialHostels={SAMPLE_HOSTELS} />
        </TabsContent>

        <TabsContent value="group">
          <GroupBuilder cycleId="demo-cycle-2026" currentUserId="usr_student" />
        </TabsContent>
      </Tabs>
    </div>
  );
}

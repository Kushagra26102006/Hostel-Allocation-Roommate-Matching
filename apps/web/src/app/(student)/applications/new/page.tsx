import React from "react";
import { ApplicationForm } from "@/components/application/application-form";

export const metadata = {
  title: "Apply for Hostel Allocation | HostelHub",
  description: "Multi-step hostel application form with autosave and document verification.",
};

export default function NewApplicationPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <ApplicationForm cycleId="demo-cycle-2026" />
    </div>
  );
}

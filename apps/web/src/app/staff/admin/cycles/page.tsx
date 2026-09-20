import React from "react";
import { CycleWizard } from "@/components/admin/cycle-wizard";

export const metadata = {
  title: "Cycle Wizard & Management | HostelHub Staff",
  description: "Configure allocation cycles, quota seat capacities, document rules, and schedules.",
};

export default function CyclesAdminPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <CycleWizard />
    </div>
  );
}

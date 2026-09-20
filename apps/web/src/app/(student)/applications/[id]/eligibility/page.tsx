import React from "react";
import { StudentEligibilityCard } from "@/components/policy/student-eligibility-card";

export const metadata = {
  title: "Application Eligibility Status | HostelHub",
  description: "View passed and failed eligibility rules with action links.",
};

export default async function StudentEligibilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Sample results for display in dev / student portal
  const sampleResults = [
    {
      ruleId: "r_distance",
      ruleName: "Distance Cutoff (min 50 km)",
      passed: true,
      reason: "Your permanent residence distance (240 km) satisfies the cutoff.",
      policyRef: "POL-2026-01",
    },
    {
      ruleId: "r_hold",
      ruleName: "No Academic/Administrative Hold",
      passed: true,
      reason: "No active holds found on your student record.",
      policyRef: "POL-2026-02",
    },
    {
      ruleId: "r_doc_income",
      ruleName: "Family Income Certificate Verification",
      passed: false,
      reason: "Your fee category or income document is not yet verified.",
      policyRef: "POL-2026-04",
      howToFixLink: "/applications/new?step=1",
      howToFixLabel: "Upload Verified Document",
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <StudentEligibilityCard eligible={false} results={sampleResults} applicationId={id} />
    </div>
  );
}

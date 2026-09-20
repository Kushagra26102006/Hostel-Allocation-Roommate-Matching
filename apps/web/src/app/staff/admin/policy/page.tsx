import React from "react";
import { RuleBuilder } from "@/components/policy/rule-builder";

export const metadata = {
  title: "Eligibility Rule Builder & Policy | HostelHub Staff",
  description:
    "Configure eligibility rules using AST DSL, preview in plain language, test applicants, and export policy mappings.",
};

export default function StaffPolicyPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <RuleBuilder />
    </div>
  );
}

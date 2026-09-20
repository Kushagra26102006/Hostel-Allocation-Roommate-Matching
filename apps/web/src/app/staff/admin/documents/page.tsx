import React from "react";
import { DocumentVerificationQueue } from "@/components/admin/document-verification-queue";

export const metadata = {
  title: "Document Verification Queue | HostelHub Staff",
  description: "Staff audit queue to verify or reject student uploaded documents.",
};

export default function DocumentQueuePage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <DocumentVerificationQueue />
    </div>
  );
}

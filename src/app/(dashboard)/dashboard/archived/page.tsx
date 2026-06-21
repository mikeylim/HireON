"use client";

import { XCircle } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";
import { PageHeader } from "@/components/layout/page-header";

export default function ArchivedPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Archived"
        description="Rejected, expired, or dismissed jobs. You can restore them from the detail view."
        icon={XCircle}
        accent="rose"
      />

      <JobList
        status={["archived", "rejected"]}
        exportFilename="hireon-archived"
        emptyIcon={<XCircle className="mx-auto h-12 w-12 text-[var(--muted)]" />}
        emptyTitle="Nothing archived"
        emptyDescription="Jobs you dismiss or that get rejected will end up here."
      />
    </div>
  );
}

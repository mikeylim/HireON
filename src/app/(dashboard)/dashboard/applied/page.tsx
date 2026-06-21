"use client";

import { CheckCircle2 } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";
import { PageHeader } from "@/components/layout/page-header";

export default function AppliedJobsPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Applied"
        description="Jobs you've submitted applications for. Click to update status when you hear back."
        icon={CheckCircle2}
        accent="blue"
      />

      <JobList
        status="applied"
        exportFilename="hireon-applied-jobs"
        emptyIcon={<CheckCircle2 className="mx-auto h-12 w-12 text-[var(--muted)]" />}
        emptyTitle="No applications yet"
        emptyDescription="Mark jobs as 'Applied' from the detail view to track them here."
      />
    </div>
  );
}

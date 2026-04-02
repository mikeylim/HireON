"use client";

import { CheckCircle2 } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";

export default function AppliedJobsPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Applied</h1>
        <p className="text-sm text-[var(--muted)]">
          Jobs you&apos;ve submitted applications for. Click to update status when you hear back.
        </p>
      </div>

      <JobList
        status="applied"
        emptyIcon={<CheckCircle2 className="mx-auto h-12 w-12 text-[var(--muted)]" />}
        emptyTitle="No applications yet"
        emptyDescription="Mark jobs as 'Applied' from the detail view to track them here."
      />
    </div>
  );
}

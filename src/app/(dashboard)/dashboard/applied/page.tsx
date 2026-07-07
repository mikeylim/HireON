"use client";

import Link from "next/link";
import { CheckCircle2, Settings } from "lucide-react";
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

      <div className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-blue-900 dark:text-blue-100">
          Resume versions are reusable dropdown options. Manage them in Settings
          without changing historical application records.
        </p>
        <Link
          href="/dashboard/settings"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          <Settings className="h-3.5 w-3.5" />
          Manage resume versions
        </Link>
      </div>

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

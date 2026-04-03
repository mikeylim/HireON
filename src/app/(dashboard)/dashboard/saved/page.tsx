"use client";

import { Bookmark } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";

export default function SavedJobsPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Saved Jobs</h1>
        <p className="text-sm text-[var(--muted)]">
          Jobs you bookmarked for later review. Click any job to change its status or add notes.
        </p>
      </div>

      <JobList
        status="saved"
        exportFilename="hireon-saved-jobs"
        emptyIcon={<Bookmark className="mx-auto h-12 w-12 text-[var(--muted)]" />}
        emptyTitle="No saved jobs"
        emptyDescription="Save jobs from the All Jobs page or add them manually."
      />
    </div>
  );
}

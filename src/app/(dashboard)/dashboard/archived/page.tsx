"use client";

import { XCircle } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";

export default function ArchivedPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Archived</h1>
        <p className="text-sm text-[var(--muted)]">
          Rejected, expired, or dismissed jobs. You can restore them from the detail view.
        </p>
      </div>

      <JobList
        status={["archived", "rejected"]}
        emptyIcon={<XCircle className="mx-auto h-12 w-12 text-[var(--muted)]" />}
        emptyTitle="Nothing archived"
        emptyDescription="Jobs you dismiss or that get rejected will end up here."
      />
    </div>
  );
}

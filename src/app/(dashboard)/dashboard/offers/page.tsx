"use client";

import { Trophy } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";
import { PageHeader } from "@/components/layout/page-header";

export default function OffersPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Offers"
        description="Jobs where you received an offer. Click to add salary details and response deadlines."
        icon={Trophy}
        accent="green"
      />

      <JobList
        status="offer"
        exportFilename="hireon-offers"
        emptyIcon={<Trophy className="mx-auto h-12 w-12 text-[var(--muted)]" />}
        emptyTitle="No offers yet"
        emptyDescription="When you receive offers, move jobs here to track salary and deadlines."
      />
    </div>
  );
}

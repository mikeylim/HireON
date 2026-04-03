"use client";

import { Trophy } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";

export default function OffersPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Offers</h1>
        <p className="text-sm text-[var(--muted)]">
          Jobs where you received an offer. Click to add salary details and response deadlines.
        </p>
      </div>

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

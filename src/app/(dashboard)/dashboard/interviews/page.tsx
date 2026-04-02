"use client";

import { CalendarClock } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";

export default function InterviewsPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Interviews</h1>
        <p className="text-sm text-[var(--muted)]">
          Jobs where you have an interview scheduled or completed. Use notes for dates and prep.
        </p>
      </div>

      <JobList
        status="interview"
        emptyIcon={<CalendarClock className="mx-auto h-12 w-12 text-[var(--muted)]" />}
        emptyTitle="No interviews scheduled"
        emptyDescription="When you land interviews, move jobs here from the detail view."
      />
    </div>
  );
}

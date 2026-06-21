"use client";

import { CalendarClock } from "lucide-react";
import { JobList } from "@/components/jobs/job-list";
import { PageHeader } from "@/components/layout/page-header";

export default function InterviewsPage() {
  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Interviews"
        description="Jobs where you have an interview scheduled or completed. Use notes for dates and prep."
        icon={CalendarClock}
        accent="purple"
      />

      <JobList
        status="interview"
        exportFilename="hireon-interviews"
        emptyIcon={<CalendarClock className="mx-auto h-12 w-12 text-[var(--muted)]" />}
        emptyTitle="No interviews scheduled"
        emptyDescription="When you land interviews, move jobs here from the detail view."
      />
    </div>
  );
}

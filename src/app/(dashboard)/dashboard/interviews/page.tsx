import { CalendarClock } from "lucide-react";

// Interview tracking — jobs where you got a callback
export default function InterviewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Interviews</h1>
        <p className="text-sm text-[var(--muted)]">
          Track upcoming and past interviews.
        </p>
      </div>

      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-8 text-center">
        <CalendarClock className="mx-auto h-12 w-12 text-[var(--muted)]" />
        <h3 className="mt-4 text-lg font-semibold">No interviews scheduled</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          When you land interviews, move jobs here to keep track of dates and notes.
        </p>
      </div>
    </div>
  );
}

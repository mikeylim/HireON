"use client";

import {
  Plus,
  Bookmark,
  Send,
  CalendarClock,
  Trophy,
  XCircle,
  Archive,
} from "lucide-react";
import type { Job } from "@/lib/types/job";

// Each event in the timeline — only shown if the job has that date
interface TimelineEvent {
  label: string;
  date: string;
  icon: typeof Bookmark;
  color: string;
  ringColor: string;
}

// Build a list of events from the job, in chronological order
function buildEvents(job: Job): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // Every job has scraped_at — this is the "first seen" moment
  events.push({
    label: "Added",
    date: job.scraped_at,
    icon: Plus,
    color: "text-[var(--muted)]",
    ringColor: "ring-[var(--sidebar-border)]",
  });

  // Job posting's own deadline — shown if provided
  if (job.deadline) {
    events.push({
      label: "Deadline",
      date: job.deadline,
      icon: CalendarClock,
      color: "text-[var(--warning)]",
      ringColor: "ring-yellow-400 dark:ring-yellow-600",
    });
  }

  // We treat "saved" status as having happened at created_at
  // since we don't track a separate saved_date. Skip it if the job is "new"
  // to avoid duplication with "Added"
  if (job.status !== "new") {
    events.push({
      label: "Saved",
      date: job.created_at,
      icon: Bookmark,
      color: "text-[var(--warning)]",
      ringColor: "ring-yellow-400 dark:ring-yellow-600",
    });
  }

  if (job.applied_date) {
    events.push({
      label: "Applied",
      date: job.applied_date,
      icon: Send,
      color: "text-[var(--primary)]",
      ringColor: "ring-blue-400 dark:ring-blue-600",
    });
  }

  if (job.interview_date) {
    events.push({
      label: "Interview",
      date: job.interview_date,
      icon: CalendarClock,
      color: "text-purple-500",
      ringColor: "ring-purple-400 dark:ring-purple-600",
    });
  }

  if (job.offer_date) {
    events.push({
      label: "Offer received",
      date: job.offer_date,
      icon: Trophy,
      color: "text-[var(--success)]",
      ringColor: "ring-green-400 dark:ring-green-600",
    });
  }

  if (job.rejected_date) {
    events.push({
      label: "Rejected",
      date: job.rejected_date,
      icon: XCircle,
      color: "text-[var(--destructive)]",
      ringColor: "ring-red-400 dark:ring-red-600",
    });
  }

  if (job.archived_date) {
    events.push({
      label: "Archived",
      date: job.archived_date,
      icon: Archive,
      color: "text-[var(--muted)]",
      ringColor: "ring-gray-400 dark:ring-gray-600",
    });
  }

  // Sort ascending so the earliest event is at the top
  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

// Format date as "Apr 5, 2026" or "Apr 5, 2026 at 2:30 PM" if it has a time
function formatDate(iso: string): string {
  const d = new Date(iso);
  const hasTime = iso.includes("T") && d.getHours() + d.getMinutes() > 0;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(hasTime && { hour: "numeric", minute: "2-digit" }),
  });
}

export function ApplicationTimeline({ job }: { job: Job }) {
  const events = buildEvents(job);

  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4">
      <h3 className="mb-3 text-sm font-semibold">Application Timeline</h3>
      <ol className="space-y-3">
        {events.map((event, i) => (
          <li key={`${event.label}-${i}`} className="relative flex items-start gap-3">
            {/* Vertical connecting line — hide on the last item */}
            {i < events.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[11px] top-6 h-full w-px bg-[var(--sidebar-border)]"
              />
            )}

            {/* Dot with icon */}
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--background)] ring-2 ${event.ringColor}`}
            >
              <event.icon className={`h-3 w-3 ${event.color}`} />
            </span>

            {/* Label and date */}
            <div className="flex-1 pt-0.5">
              <p className="text-sm font-medium">{event.label}</p>
              <p className="text-xs text-[var(--muted)]">{formatDate(event.date)}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

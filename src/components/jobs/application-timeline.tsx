"use client";

import {
  Bookmark,
  Send,
  CalendarClock,
  Trophy,
  XCircle,
  Archive,
  X,
  PlusCircle,
} from "lucide-react";
import type { Job } from "@/lib/types/job";
import { parseDate } from "@/lib/utils";

// Scraper sources that have nicer display labels than their internal keys
const SCRAPER_LABELS: Record<string, string> = {
  jobbank: "Job Bank",
  adzuna: "Adzuna",
  jooble: "Jooble",
  remotive: "Remotive",
};

// Field names that map to clearable DB columns. Events with a `field` get
// a small × button that calls back to the parent modal to clear that date.
export type ClearableField =
  | "deadline"
  | "applied_date"
  | "interview_date"
  | "offer_date"
  | "rejected_date"
  | "archived_date";

interface TimelineEvent {
  label: string;
  date: string;
  icon: typeof Bookmark;
  color: string;
  ringColor: string;
  // System-set events (Added, Saved) don't have a field and can't be deleted.
  // User-controlled events (Applied, Interview, etc.) do.
  field?: ClearableField;
}

function buildEvents(job: Job): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // First event — "when this job entered HireON". Label depends on how:
  //   - Scraper sources get "Saved from Job Bank" (or Adzuna, etc.)
  //   - Anything else (Indeed, LinkedIn, company site, etc.) is "Added manually"
  // This replaces the old redundant Added + Saved pair, since both timestamps
  // were the same moment and one of them ("Saved") could be misleading
  // if the user skipped saved state via the Add Job form.
  const scraperLabel = SCRAPER_LABELS[job.source];
  events.push({
    label: scraperLabel ? `Saved from ${scraperLabel}` : "Added manually",
    date: job.created_at,
    icon: scraperLabel ? Bookmark : PlusCircle,
    color: "text-[var(--muted)]",
    ringColor: "ring-[var(--sidebar-border)]",
  });

  if (job.deadline) {
    events.push({
      label: "Deadline",
      date: job.deadline,
      icon: CalendarClock,
      color: "text-[var(--warning)]",
      ringColor: "ring-yellow-400 dark:ring-yellow-600",
      field: "deadline",
    });
  }

  if (job.applied_date) {
    events.push({
      label: "Applied",
      date: job.applied_date,
      icon: Send,
      color: "text-[var(--primary)]",
      ringColor: "ring-blue-400 dark:ring-blue-600",
      field: "applied_date",
    });
  }

  if (job.interview_date) {
    events.push({
      label: "Interview",
      date: job.interview_date,
      icon: CalendarClock,
      color: "text-purple-500",
      ringColor: "ring-purple-400 dark:ring-purple-600",
      field: "interview_date",
    });
  }

  if (job.offer_date) {
    events.push({
      label: "Offer received",
      date: job.offer_date,
      icon: Trophy,
      color: "text-[var(--success)]",
      ringColor: "ring-green-400 dark:ring-green-600",
      field: "offer_date",
    });
  }

  if (job.rejected_date) {
    events.push({
      label: "Rejected",
      date: job.rejected_date,
      icon: XCircle,
      color: "text-[var(--destructive)]",
      ringColor: "ring-red-400 dark:ring-red-600",
      field: "rejected_date",
    });
  }

  if (job.archived_date) {
    events.push({
      label: "Archived",
      date: job.archived_date,
      icon: Archive,
      color: "text-[var(--muted)]",
      ringColor: "ring-gray-400 dark:ring-gray-600",
      field: "archived_date",
    });
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function formatDate(iso: string): string {
  // parseDate handles the calendar-date vs real-timestamp distinction safely
  const d = parseDate(iso);
  if (!d) return iso;
  // Only show time if the original string carries a meaningful time
  // (not just date-only or UTC-midnight). After parseDate, a calendar-date
  // value will have hours/minutes of 0, so this check still works.
  const hasTime = iso.includes("T") && (d.getHours() + d.getMinutes() > 0);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(hasTime && { hour: "numeric", minute: "2-digit" }),
  });
}

interface Props {
  job: Job;
  // When user clicks × on an event, parent receives the field name and is
  // expected to clear the corresponding local state. The modal's existing
  // Save Changes flow then persists the cleared date as null.
  onClearEvent?: (field: ClearableField) => void;
}

export function ApplicationTimeline({ job, onClearEvent }: Props) {
  const events = buildEvents(job);
  if (events.length === 0) return null;

  return (
    <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4">
      <h3 className="mb-3 text-sm font-semibold">Application Timeline</h3>
      <ol className="space-y-3">
        {events.map((event, i) => (
          <li
            key={`${event.label}-${i}`}
            className="group relative flex items-start gap-3"
          >
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

            {/* Delete button — only on user-controlled events */}
            {event.field && onClearEvent && (
              <button
                onClick={() => onClearEvent(event.field!)}
                title={`Remove this ${event.label.toLowerCase()} event`}
                className="invisible mt-0.5 rounded-md p-1 text-[var(--muted)] opacity-0 transition-opacity hover:bg-[var(--accent)] hover:text-[var(--destructive)] group-hover:visible group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

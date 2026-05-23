"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Send,
  CalendarClock,
  Archive,
  Trash2,
  Check,
  Loader2,
  X,
  StickyNote,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { JobDetailModal } from "./job-detail-modal";
import { ExportButton } from "./export-button";
import type { Job, JobStatus } from "@/lib/types/job";
import { titleCase, relativeTime, parseDate, todayLocal } from "@/lib/utils";

const JOBS_PER_PAGE = 15;

type SortField = "scraped_at" | "relevance_score" | "salary_min" | "posted_at" | "deadline" | "title";

interface JobListProps {
  status: JobStatus | JobStatus[];
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  exportFilename?: string;
  // Per-page default sort. e.g. Saved defaults to deadline asc (soonest first),
  // Applied could default to applied_date desc (most recent first), etc.
  defaultSort?: SortField;
  defaultSortAsc?: boolean;
}

// Reusable job list with pagination, sorting, and click-to-open detail modal
export function JobList({
  status,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  exportFilename,
  defaultSort = "scraped_at",
  defaultSortAsc = false,
}: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>(defaultSort);
  const [sortAsc, setSortAsc] = useState(defaultSortAsc);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  // Multi-select state for bulk actions — set of selected job IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / JOBS_PER_PAGE));
  const statuses = Array.isArray(status) ? status : [status];

  const loadJobs = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      const from = (pageNum - 1) * JOBS_PER_PAGE;
      const to = from + JOBS_PER_PAGE - 1;

      const supabase = createBrowserSupabase();
      let query = supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .in("status", statuses)
        .order(sortField, {
          ascending: sortAsc,
          nullsFirst: false,
        })
        .range(from, to);

      // Simple search across title and company
      if (searchQuery.trim()) {
        query = query.or(
          `title.ilike.%${searchQuery.trim()}%,company.ilike.%${searchQuery.trim()}%`
        );
      }

      const { data, count } = await query;

      setJobs((data as Job[]) ?? []);
      setTotal(count ?? 0);
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sortField, sortAsc, searchQuery, JSON.stringify(statuses)]
  );

  useEffect(() => {
    loadJobs(page);
  }, [loadJobs, page]);

  // When sort changes, go back to page 1
  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setPage(1);
  }

  // After a status change in the modal — keep modal open so user can correct mistakes.
  // The job card is removed from this page's list if the status no longer matches,
  // but the modal stays open showing the updated job.
  function handleJobUpdate(updatedJob: Job) {
    const belongsHere = statuses.includes(updatedJob.status);
    const existsInList = jobs.some((j) => j.id === updatedJob.id);

    if (belongsHere && existsInList) {
      // Still on this page — update in place
      setJobs((prev) =>
        prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))
      );
    } else if (belongsHere && !existsInList) {
      // Moved back to this page — add it to the top of the list
      setJobs((prev) => [updatedJob, ...prev]);
      setTotal((prev) => prev + 1);
    } else if (!belongsHere && existsInList) {
      // Moved away from this page — remove it
      setJobs((prev) => prev.filter((j) => j.id !== updatedJob.id));
      setTotal((prev) => prev - 1);
    }

    setSelectedJob(updatedJob);
  }

  function handleJobDelete(id: string) {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setTotal((prev) => prev - 1);
  }

  // Quick status change directly from the card — no modal needed
  async function quickStatusChange(e: React.MouseEvent, jobId: string, newStatus: JobStatus) {
    e.stopPropagation(); // don't open the modal
    const updates: Record<string, unknown> = { status: newStatus };
    // Local calendar date (not ISO timestamp) — see handleStatusChange in modal
    const today = todayLocal();
    if (newStatus === "applied") updates.applied_date = today;
    if (newStatus === "interview") updates.interview_date = null;
    if (newStatus === "archived") updates.archived_date = today;

    try {
      const res = await fetch("/api/jobs/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, updates }),
      });
      const result = await res.json();
      if (result.data) handleJobUpdate(result.data);
    } catch (err) {
      console.error("Quick status change failed:", err);
    }
  }

  // Determine which quick actions to show based on the current page's status
  function getQuickActions(currentStatus: JobStatus) {
    switch (currentStatus) {
      case "saved":
        return [
          { status: "applied" as JobStatus, icon: Send, label: "Applied" },
          { status: "archived" as JobStatus, icon: Archive, label: "Archive" },
        ];
      case "applied":
        return [
          { status: "interview" as JobStatus, icon: CalendarClock, label: "Interview" },
          { status: "archived" as JobStatus, icon: Archive, label: "Archive" },
        ];
      case "interview":
        return [
          { status: "offer" as JobStatus, icon: Send, label: "Offer" },
          { status: "archived" as JobStatus, icon: Archive, label: "Archive" },
        ];
      default:
        return [];
    }
  }

  // Toggle a single job's selection
  function toggleSelection(jobId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }

  // Select/deselect every visible job on this page
  function toggleSelectAll() {
    if (selectedIds.size === jobs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  }

  // Bulk status change — hits the API once with all selected IDs
  async function bulkChangeStatus(newStatus: JobStatus) {
    if (selectedIds.size === 0) return;
    setBulkActing(true);
    // Local calendar date (not ISO timestamp) — see handleStatusChange in modal
    const today = todayLocal();
    const updates: Record<string, unknown> = { status: newStatus };
    if (newStatus === "applied") updates.applied_date = today;
    if (newStatus === "archived") updates.archived_date = today;
    if (newStatus === "rejected") updates.rejected_date = today;
    if (newStatus === "offer") updates.offer_date = today;

    try {
      await fetch("/api/jobs/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), updates }),
      });
      clearSelection();
      loadJobs(page);
    } catch (err) {
      console.error("Bulk status change failed:", err);
    } finally {
      setBulkActing(false);
    }
  }

  // Bulk delete — permanently removes selected jobs
  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkActing(true);
    try {
      await fetch("/api/jobs/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      clearSelection();
      loadJobs(page);
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setBulkActing(false);
    }
  }

  // Status-aware "context line" — surfaces the most relevant date for what
  // page you're on. Returns { icon, text, urgent? } or null.
  function getContextLine(job: Job): { icon: typeof CalendarDays; text: string; urgent?: boolean } | null {
    // Upcoming deadline is the most urgent thing to show on any page
    if (job.deadline) {
      const days = relativeTime(job.deadline);
      const date = parseDate(job.deadline);
      if (days && date) {
        // Compare at day granularity so today's deadline still counts as urgent
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date.getTime() >= today.getTime()) {
          return { icon: AlertTriangle, text: `Deadline ${days}`, urgent: true };
        }
      }
    }

    // Otherwise, show the most recent meaningful status date
    switch (job.status) {
      case "interview":
        if (job.interview_date) {
          return { icon: CalendarClock, text: `Interview ${relativeTime(job.interview_date)}` };
        }
        break;
      case "offer":
        if (job.offer_date) {
          return { icon: CalendarDays, text: `Offer received ${relativeTime(job.offer_date)}` };
        }
        break;
      case "applied":
        if (job.applied_date) {
          return { icon: CalendarDays, text: `Applied ${relativeTime(job.applied_date)}` };
        }
        break;
      case "rejected":
        if (job.rejected_date) {
          return { icon: CalendarDays, text: `Rejected ${relativeTime(job.rejected_date)}` };
        }
        break;
      case "archived":
        if (job.archived_date) {
          return { icon: CalendarDays, text: `Archived ${relativeTime(job.archived_date)}` };
        }
        break;
      case "saved":
      case "new":
        // Fall through to scraped_at as the default "when did this enter your list"
        break;
    }

    // Default: when was this added to your list
    if (job.scraped_at) {
      return { icon: CalendarDays, text: `Added ${relativeTime(job.scraped_at)}` };
    }
    return null;
  }

  const sortOptions: { field: SortField; label: string }[] = [
    { field: "scraped_at", label: "Date Added" },
    { field: "relevance_score", label: "AI Score" },
    { field: "salary_min", label: "Salary" },
    { field: "deadline", label: "Deadline" },
    { field: "title", label: "Title" },
  ];

  return (
    <>
      {/* Search + sort controls */}
      <div className="space-y-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by title or company..."
          className="w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
        />

        <div className="flex flex-wrap items-center gap-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.field}
              onClick={() => handleSort(opt.field)}
              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                sortField === opt.field
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--sidebar-border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
              }`}
            >
              {opt.label}
              {sortField === opt.field && (
                <ArrowUpDown className="h-3 w-3" />
              )}
            </button>
          ))}
          <ExportButton statuses={statuses} filename={exportFilename} />
        </div>
      </div>

      {/* Bulk action bar — shown when one or more jobs are selected */}
      {selectedIds.size > 0 && (
        <div className="sticky top-16 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-[var(--primary)] bg-[var(--primary)] p-3 text-white shadow-lg">
          <div className="flex items-center gap-2">
            <button
              onClick={clearSelection}
              className="rounded-lg p-1 hover:bg-white/20"
              title="Clear selection"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium">
              {selectedIds.size} selected
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* Context-appropriate bulk status buttons */}
            {statuses.length === 1 &&
              getQuickActions(statuses[0]).map((action) => (
                <button
                  key={action.status}
                  onClick={() => bulkChangeStatus(action.status)}
                  disabled={bulkActing}
                  className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-white/25 disabled:opacity-50"
                >
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              ))}

            {/* Delete with confirmation */}
            {confirmBulkDelete ? (
              <>
                <span className="text-xs">Delete permanently?</span>
                <button
                  onClick={bulkDelete}
                  disabled={bulkActing}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkActing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Yes
                </button>
                <button
                  onClick={() => setConfirmBulkDelete(false)}
                  className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25"
                >
                  No
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmBulkDelete(true)}
                disabled={bulkActing}
                className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium transition-colors hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {/* Count + pagination header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-3">
          {jobs.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  selectedIds.size === jobs.length
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--sidebar-border)]"
                }`}
              >
                {selectedIds.size === jobs.length && <Check className="h-2.5 w-2.5" />}
              </div>
              Select all
            </button>
          )}
          <p className="text-sm text-[var(--muted)]">
            {total} job{total !== 1 ? "s" : ""}
          </p>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-[var(--sidebar-border)] p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm text-[var(--muted)]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-[var(--sidebar-border)] p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Job cards */}
      {loading ? (
        <p className="py-8 text-center text-sm text-[var(--muted)]">Loading...</p>
      ) : jobs.length > 0 ? (
        <div className="space-y-3">
          {jobs.map((job) => {
            const ctx = getContextLine(job);
            return (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className={`cursor-pointer rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 transition-colors hover:border-[var(--primary)] ${
                selectedIds.has(job.id) ? "ring-2 ring-[var(--primary)]" : ""
              } ${
                statuses.length > 1 && job.status === "rejected"
                  ? "border-l-4 border-l-red-400 dark:border-l-red-600"
                  : statuses.length > 1 && job.status === "archived"
                    ? "border-l-4 border-l-gray-400 dark:border-l-gray-600"
                    : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Selection checkbox */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(job.id);
                  }}
                  className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    selectedIds.has(job.id)
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--sidebar-border)] hover:border-[var(--primary)]"
                  }`}
                  aria-label="Select job"
                >
                  {selectedIds.has(job.id) && <Check className="h-3 w-3" />}
                </button>

                {/* Main content */}
                <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {/* Title row with notes icon */}
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{titleCase(job.title)}</h3>
                      {job.notes && (
                        <StickyNote
                          className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]"
                          aria-label="Has notes"
                        />
                      )}
                    </div>

                    {/* Company · Location · Job Type */}
                    <p className="truncate text-sm text-[var(--muted)]">
                      {job.company} <span className="opacity-50">·</span> {job.location}
                      {job.job_type && job.job_type !== "full-time" && (
                        <>
                          {" "}
                          <span className="opacity-50">·</span>{" "}
                          <span className="capitalize">{job.job_type.replace("-", " ")}</span>
                        </>
                      )}
                    </p>

                    {/* Tag row — source, work mode, status (for multi-status pages), reasons */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                        {job.source}
                      </span>
                      {job.work_mode && job.work_mode !== "onsite" && (
                        <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                          {job.work_mode}
                        </span>
                      )}
                      {statuses.length > 1 && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                            job.status === "rejected"
                              ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                              : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          {job.status}
                        </span>
                      )}
                      {job.status === "rejected" && job.rejection_reason && (
                        <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] text-red-600 dark:bg-red-950 dark:text-red-400">
                          {job.rejection_reason.replace(/_/g, " ")}
                        </span>
                      )}
                      {job.status === "archived" && job.archive_reason && (
                        <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {job.archive_reason.replace(/_/g, " ")}
                        </span>
                      )}
                    </div>

                    {/* Context line — most relevant date for the current page/status */}
                    {ctx && (
                      <p
                        className={`mt-2 flex items-center gap-1.5 text-xs ${
                          ctx.urgent
                            ? "font-medium text-[var(--warning)]"
                            : "text-[var(--muted)]"
                        }`}
                      >
                        <ctx.icon className="h-3.5 w-3.5" />
                        {ctx.text}
                      </p>
                    )}
                  </div>

                  {/* Right side: score + salary + quick actions */}
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <div className="flex items-center gap-2">
                      {job.relevance_score !== null && (
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            job.relevance_score >= 70
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              : job.relevance_score >= 40
                                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                          title={`Relevance score: ${job.relevance_score}/100`}
                        >
                          {job.relevance_score}
                        </span>
                      )}
                      {job.salary_min && (
                        <span className="whitespace-nowrap rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-semibold">
                          ${(job.salary_min / 1000).toFixed(0)}k
                          {job.salary_max
                            ? `–$${(job.salary_max / 1000).toFixed(0)}k`
                            : "+"}
                        </span>
                      )}
                    </div>
                    {getQuickActions(job.status).length > 0 && (
                      <div className="flex gap-1.5">
                        {getQuickActions(job.status).map((action) => (
                          <button
                            key={action.status}
                            onClick={(e) => quickStatusChange(e, job.id, action.status)}
                            className="flex items-center gap-1 rounded-lg border border-[var(--sidebar-border)] px-2 py-1 text-xs text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                            title={`Mark as ${action.label}`}
                          >
                            <action.icon className="h-3 w-3" />
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })}

          {/* Bottom pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg border border-[var(--sidebar-border)] p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-[var(--muted)]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg border border-[var(--sidebar-border)] p-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--accent)] hover:text-[var(--foreground)] disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-8 text-center">
          {emptyIcon}
          <h3 className="mt-4 text-lg font-semibold">{emptyTitle}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {emptyDescription}
          </p>
        </div>
      )}

      {/* Detail modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={handleJobUpdate}
          onDelete={handleJobDelete}
        />
      )}
    </>
  );
}

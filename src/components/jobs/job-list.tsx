"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Send,
  CalendarClock,
  Archive,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { JobDetailModal } from "./job-detail-modal";
import { ExportButton } from "./export-button";
import type { Job, JobStatus } from "@/lib/types/job";
import { titleCase } from "@/lib/utils";

const JOBS_PER_PAGE = 15;

type SortField = "scraped_at" | "relevance_score" | "salary_min" | "posted_at" | "deadline" | "title";

interface JobListProps {
  status: JobStatus | JobStatus[];
  emptyIcon: React.ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  exportFilename?: string;
}

// Reusable job list with pagination, sorting, and click-to-open detail modal
export function JobList({
  status,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  exportFilename,
}: JobListProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("scraped_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / JOBS_PER_PAGE));
  const statuses = Array.isArray(status) ? status : [status];

  const loadJobs = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      const from = (pageNum - 1) * JOBS_PER_PAGE;
      const to = from + JOBS_PER_PAGE - 1;

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
    const now = new Date().toISOString();
    if (newStatus === "applied") updates.applied_date = now;
    if (newStatus === "interview") updates.interview_date = null;
    if (newStatus === "archived") updates.archived_date = now;

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
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by title or company..."
          className="flex-1 rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
        />

        <div className="flex items-center gap-1">
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

      {/* Count + pagination header */}
      <div className="flex items-end justify-between">
        <p className="text-sm text-[var(--muted)]">
          {total} job{total !== 1 ? "s" : ""}
        </p>
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
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job)}
              className="cursor-pointer rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 transition-colors hover:border-[var(--primary)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{titleCase(job.title)}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {job.company} · {job.location}
                  </p>
                  {job.description && (
                    <p className="mt-1 overflow-hidden truncate break-all text-xs text-[var(--muted)]">
                      {job.description}
                    </p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                      {job.source}
                    </span>
                    {job.work_mode && job.work_mode !== "onsite" && (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                        {job.work_mode}
                      </span>
                    )}
                    {job.notes && (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                        has notes
                      </span>
                    )}
                  </div>
                </div>
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
                      >
                        {job.relevance_score}
                      </span>
                    )}
                    {job.salary_min && (
                      <span className="whitespace-nowrap rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium">
                        ${(job.salary_min / 1000).toFixed(0)}k
                        {job.salary_max
                          ? `–$${(job.salary_max / 1000).toFixed(0)}k`
                          : "+"}
                      </span>
                    )}
                  </div>
                  {/* Quick action buttons — aligned right under the badges */}
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
          ))}

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

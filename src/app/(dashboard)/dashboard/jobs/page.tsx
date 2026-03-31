"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Save,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { ScrapeButton } from "@/components/jobs/scrape-button";
import type { Job } from "@/lib/types/job";
import type { PreviewJob } from "@/lib/types/preview";

const JOBS_PER_PAGE = 15;

// Two tabs: "Preview" shows scrape results, "Saved" shows what's in the database
type Tab = "preview" | "saved";

export default function AllJobsPage() {
  // --- Preview state (in-memory, not saved yet) ---
  const [preview, setPreview] = useState<PreviewJob[]>([]);
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [scoreThreshold, setScoreThreshold] = useState(40);

  // --- Saved state (from Supabase) ---
  const [savedJobs, setSavedJobs] = useState<Job[]>([]);
  const [totalSaved, setTotalSaved] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // --- UI state ---
  const [tab, setTab] = useState<Tab>("preview");

  const totalPages = Math.max(1, Math.ceil(totalSaved / JOBS_PER_PAGE));

  // Load saved jobs from Supabase (paginated)
  const loadSavedJobs = useCallback(async (pageNum: number) => {
    setLoadingSaved(true);
    const from = (pageNum - 1) * JOBS_PER_PAGE;
    const to = from + JOBS_PER_PAGE - 1;

    const { data, count } = await supabase
      .from("jobs")
      .select("*", { count: "exact" })
      .order("relevance_score", { ascending: false, nullsFirst: false })
      .range(from, to);

    setSavedJobs((data as Job[]) ?? []);
    setTotalSaved(count ?? 0);
    setLoadingSaved(false);
  }, []);

  useEffect(() => {
    loadSavedJobs(page);
  }, [loadSavedJobs, page]);

  // When scrape results come in, switch to preview tab and start Gemini scoring
  function handleScrapeResults(jobs: PreviewJob[]) {
    setPreview(jobs);
    setSaveMessage(null);
    if (jobs.length > 0) {
      setTab("preview");
      runScoring(jobs);
    }
  }

  // Score all preview jobs via Gemini in the background
  async function runScoring(jobs: PreviewJob[]) {
    setScoring(true);
    try {
      const res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobs: jobs.map((j) => ({
            title: j.title,
            company: j.company,
            location: j.location,
            description: j.description,
            salary_min: j.salary_min,
            salary_max: j.salary_max,
          })),
          userContext:
            "junior developer looking for full-stack, frontend, or software developer roles in Toronto/GTA/Ontario",
        }),
      });

      const result = await res.json();
      const scores: Array<{ index: number; score: number; reason: string }> =
        result.scores ?? [];

      // Merge scores into preview jobs and sort by score descending
      setPreview((prev) => {
        const updated = [...prev];
        scores.forEach((s) => {
          if (updated[s.index]) {
            updated[s.index] = {
              ...updated[s.index],
              relevance_score: s.score,
              score_reason: s.reason,
            };
          }
        });
        return updated.sort(
          (a, b) => (b.relevance_score ?? 0) - (a.relevance_score ?? 0)
        );
      });
    } catch (err) {
      console.error("Scoring failed:", err);
    } finally {
      setScoring(false);
    }
  }

  // Toggle individual job selection
  function toggleSelect(url: string) {
    setPreview((prev) =>
      prev.map((j) => (j.url === url ? { ...j, selected: !j.selected } : j))
    );
  }

  // Select all jobs above the score threshold
  function selectAboveThreshold() {
    setPreview((prev) =>
      prev.map((j) => ({
        ...j,
        selected: (j.relevance_score ?? 0) >= scoreThreshold,
      }))
    );
  }

  // Select / deselect all
  function selectAll(selected: boolean) {
    setPreview((prev) => prev.map((j) => ({ ...j, selected })));
  }

  // Save selected jobs to Supabase
  async function handleSave() {
    const selected = preview.filter((j) => j.selected);
    if (selected.length === 0) {
      setSaveMessage("No jobs selected.");
      return;
    }

    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobs: selected }),
      });

      const result = await res.json();
      setSaveMessage(result.message);

      // Remove saved jobs from preview so they don't show as duplicates
      const savedUrls = new Set(selected.map((j) => j.url));
      setPreview((prev) => prev.filter((j) => !savedUrls.has(j.url)));

      // Refresh the saved tab
      loadSavedJobs(1);
      setPage(1);
    } catch {
      setSaveMessage("Failed to save. Check console.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = preview.filter((j) => j.selected).length;
  const scoredCount = preview.filter((j) => j.relevance_score !== null).length;

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">All Jobs</h1>
        <p className="text-sm text-[var(--muted)]">
          Search for new jobs, review with AI scoring, and save the best ones.
        </p>
      </div>

      {/* Scrape controls */}
      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Search &amp; Scrape
        </h2>
        <ScrapeButton onResults={handleScrapeResults} />
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-1">
        <button
          onClick={() => setTab("preview")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "preview"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Preview ({preview.length})
        </button>
        <button
          onClick={() => setTab("saved")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "saved"
              ? "bg-[var(--primary)] text-white"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Saved ({totalSaved})
        </button>
      </div>

      {/* ═══════ PREVIEW TAB ═══════ */}
      {tab === "preview" && (
        <>
          {preview.length > 0 ? (
            <div className="space-y-4">
              {/* Scoring status + bulk actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4">
                <div className="flex items-center gap-3 text-sm">
                  {scoring ? (
                    <span className="flex items-center gap-2 text-[var(--muted)]">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scoring with Gemini ({scoredCount}/{preview.length})...
                    </span>
                  ) : scoredCount > 0 ? (
                    <span className="flex items-center gap-2 text-[var(--success)]">
                      <Sparkles className="h-4 w-4" />
                      All {scoredCount} jobs scored
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Threshold selector */}
                  <div className="flex items-center gap-1.5 text-sm">
                    <span className="text-[var(--muted)]">Score &ge;</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scoreThreshold}
                      onChange={(e) => setScoreThreshold(Number(e.target.value))}
                      className="w-14 rounded border border-[var(--sidebar-border)] bg-[var(--accent)] px-2 py-1 text-center text-sm outline-none focus:border-[var(--primary)]"
                    />
                    <button
                      onClick={selectAboveThreshold}
                      className="rounded-lg border border-[var(--sidebar-border)] px-3 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                    >
                      Select above
                    </button>
                  </div>

                  <button
                    onClick={() => selectAll(true)}
                    className="rounded-lg border border-[var(--sidebar-border)] px-3 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => selectAll(false)}
                    className="rounded-lg border border-[var(--sidebar-border)] px-3 py-1 text-xs font-medium text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                  >
                    Clear
                  </button>

                  {/* Save selected button */}
                  <button
                    onClick={handleSave}
                    disabled={saving || selectedCount === 0}
                    className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save {selectedCount > 0 ? `(${selectedCount})` : ""}
                  </button>
                </div>
              </div>

              {saveMessage && (
                <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                  {saveMessage}
                </p>
              )}

              {/* Preview job cards */}
              {preview.map((job) => (
                <div
                  key={job.url}
                  onClick={() => toggleSelect(job.url)}
                  className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                    job.selected
                      ? "border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30"
                      : "border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                        job.selected
                          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                          : "border-[var(--sidebar-border)]"
                      }`}
                    >
                      {job.selected && <Check className="h-3 w-3" />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <a
                            href={job.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-semibold hover:text-[var(--primary)] hover:underline"
                          >
                            {job.title}
                          </a>
                          <p className="text-sm text-[var(--muted)]">
                            {job.company} · {job.location}
                          </p>
                        </div>

                        {/* Score badge */}
                        {job.relevance_score !== null && (
                          <div
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                              job.relevance_score >= 70
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                : job.relevance_score >= 40
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                            title={job.score_reason ?? ""}
                          >
                            {job.relevance_score}
                          </div>
                        )}
                      </div>

                      {/* Short description — one line, clipped */}
                      {job.description && (
                        <p className="mt-1 overflow-hidden truncate break-all text-xs text-[var(--muted)]">
                          {job.description}
                        </p>
                      )}

                      {/* Metadata badges + AI reason */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                          {job.source}
                        </span>
                        {job.work_mode !== "onsite" && (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                            {job.work_mode}
                          </span>
                        )}
                        {job.salary_min && (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                            ${(job.salary_min / 1000).toFixed(0)}k
                            {job.salary_max
                              ? `–$${(job.salary_max / 1000).toFixed(0)}k`
                              : "+"}
                          </span>
                        )}
                      </div>
                      {job.score_reason && (
                        <p className="mt-1 text-xs italic text-[var(--muted)]">
                          AI: {job.score_reason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-8 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-[var(--muted)]" />
              <h3 className="mt-4 text-lg font-semibold">No preview results</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Use the search above to scrape jobs. Results will appear here for you to review and save.
              </p>
            </div>
          )}
        </>
      )}

      {/* ═══════ SAVED TAB ═══════ */}
      {tab === "saved" && (
        <>
          <div className="flex items-end justify-between">
            <p className="text-sm text-[var(--muted)]">
              {totalSaved} saved job{totalSaved !== 1 ? "s" : ""}
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

          {loadingSaved ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">Loading...</p>
          ) : savedJobs.length > 0 ? (
            <div className="space-y-3">
              {savedJobs.map((job) => (
                <a
                  key={job.id}
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-4 transition-colors hover:border-[var(--primary)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold">{job.title}</h3>
                      <p className="text-sm text-[var(--muted)]">
                        {job.company} · {job.location}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                          {job.source}
                        </span>
                        {job.work_mode && job.work_mode !== "onsite" && (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                            {job.work_mode}
                          </span>
                        )}
                        {job.status !== "saved" && (
                          <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-[var(--muted)]">
                            {job.status}
                          </span>
                        )}
                      </div>
                    </div>
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
                  </div>
                </a>
              ))}

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
              <Briefcase className="mx-auto h-12 w-12 text-[var(--muted)]" />
              <h3 className="mt-4 text-lg font-semibold">No saved jobs yet</h3>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Scrape jobs, review the preview, and save the ones you like.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

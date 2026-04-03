"use client";

import { useState, useEffect } from "react";
import { loadSettings } from "@/lib/settings";
import Link from "next/link";
import {
  Briefcase,
  Save,
  Loader2,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { ScrapeButton } from "@/components/jobs/scrape-button";
import { usePreview } from "@/components/jobs/preview-context";
import { titleCase } from "@/lib/utils";
import type { PreviewJob } from "@/lib/types/preview";

export default function AllJobsPage() {
  const { preview, setPreview } = usePreview();
  const [scoring, setScoring] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [lastSavedCount, setLastSavedCount] = useState(0);
  const [scoreThreshold, setScoreThreshold] = useState(40);
  const [geminiContext, setGeminiContext] = useState("");

  // Load settings on mount
  useEffect(() => {
    const s = loadSettings();
    setScoreThreshold(s.scoreThreshold);
    setGeminiContext(s.geminiContext);
  }, []);

  async function handleScrapeResults(jobs: PreviewJob[]) {
    setSaveMessage(null);
    setLastSavedCount(0);

    if (jobs.length === 0) {
      setPreview(jobs);
      return;
    }

    // Check which URLs are already in the database
    try {
      const res = await fetch("/api/jobs/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls: jobs.map((j) => j.url) }),
      });
      const { existing } = await res.json();
      const existingSet = new Set<string>(existing ?? []);

      const marked = jobs.map((j) => ({
        ...j,
        already_saved: existingSet.has(j.url),
        selected: false,
      }));
      setPreview(marked);
    } catch {
      // If check fails, just show all as unsaved
      setPreview(jobs);
    }

    runScoring(jobs);
  }

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
            geminiContext || "junior developer looking for full-stack, frontend, or software developer roles in Toronto/GTA/Ontario",
        }),
      });

      const result = await res.json();
      const scores: Array<{ index: number; score: number; reason: string }> =
        result.scores ?? [];

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

  function toggleSelect(url: string) {
    setPreview((prev) =>
      prev.map((j) =>
        j.url === url && !j.already_saved ? { ...j, selected: !j.selected } : j
      )
    );
  }

  function selectAboveThreshold() {
    setPreview((prev) =>
      prev.map((j) => ({
        ...j,
        selected: !j.already_saved && (j.relevance_score ?? 0) >= scoreThreshold,
      }))
    );
  }

  function selectAll(selected: boolean) {
    setPreview((prev) =>
      prev.map((j) => ({ ...j, selected: selected && !j.already_saved }))
    );
  }

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
      setLastSavedCount(selected.length);

      // Remove saved jobs from preview
      const savedUrls = new Set(selected.map((j) => j.url));
      setPreview((prev) => prev.filter((j) => !savedUrls.has(j.url)));
    } catch {
      setSaveMessage("Failed to save. Check console.");
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = preview.filter((j) => j.selected).length;
  const scoredCount = preview.filter((j) => j.relevance_score !== null).length;
  const alreadySavedCount = preview.filter((j) => j.already_saved).length;
  const newCount = preview.length - alreadySavedCount;

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

      {/* Post-save action bar — appears after saving jobs */}
      {lastSavedCount > 0 && saveMessage && (
        <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <p className="text-sm font-medium text-green-700 dark:text-green-300">
            {saveMessage}
          </p>
          <Link
            href="/dashboard/saved"
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
          >
            Go to Saved Jobs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Preview results */}
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
                  {scoredCount} scored · {newCount} new
                  {alreadySavedCount > 0 && (
                    <span className="text-[var(--muted)]">
                      · {alreadySavedCount} already saved
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-[var(--muted)]">
                  {preview.length} jobs found
                  {alreadySavedCount > 0 && ` · ${alreadySavedCount} already saved`}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
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

          {/* Preview job cards */}
          {preview.map((job) => (
            <div
              key={job.url}
              onClick={() => toggleSelect(job.url)}
              className={`rounded-xl border p-4 transition-colors ${
                job.already_saved
                  ? "cursor-default border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] opacity-50"
                  : job.selected
                    ? "cursor-pointer border-[var(--primary)] bg-blue-50 dark:bg-blue-950/30"
                    : "cursor-pointer border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] hover:border-[var(--primary)]/50"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox or "saved" indicator */}
                {job.already_saved ? (
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-green-500 bg-green-500 text-white">
                    <Check className="h-3 w-3" />
                  </div>
                ) : (
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      job.selected
                        ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                        : "border-[var(--sidebar-border)]"
                    }`}
                  >
                    {job.selected && <Check className="h-3 w-3" />}
                  </div>
                )}

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
                        {titleCase(job.title)}
                      </a>
                      <p className="text-sm text-[var(--muted)]">
                        {job.company} · {job.location}
                        {job.already_saved && (
                          <span className="ml-2 inline-block rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                            Already saved
                          </span>
                        )}
                      </p>
                    </div>

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

                  {job.description && (
                    <p className="mt-1 overflow-hidden truncate break-all text-xs text-[var(--muted)]">
                      {job.description}
                    </p>
                  )}

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
    </div>
  );
}

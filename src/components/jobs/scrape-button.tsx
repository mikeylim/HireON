"use client";

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import type { PreviewJob } from "@/lib/types/preview";

const ALL_SOURCES = [
  { id: "jobbank", label: "Job Bank Canada", emoji: "🇨🇦" },
  { id: "adzuna", label: "Adzuna", emoji: "🔍" },
  { id: "jooble", label: "Jooble", emoji: "📋" },
  { id: "remotive", label: "Remotive (Remote)", emoji: "🌍" },
] as const;

interface ScrapeButtonProps {
  onResults: (jobs: PreviewJob[]) => void;
}

// Scrapes jobs and passes the raw preview results up to the parent
// Nothing gets saved to the database here — that happens later
export function ScrapeButton({ onResults }: ScrapeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [keywords, setKeywords] = useState("");
  const [sources, setSources] = useState<string[]>(
    ALL_SOURCES.map((s) => s.id)
  );

  function toggleSource(id: string) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleScrape() {
    if (sources.length === 0) {
      setMessage("Pick at least one source.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
          location: "Toronto, ON",
          sources,
        }),
      });

      const result = await res.json();

      if (result.data && result.data.length > 0) {
        // Turn raw results into preview jobs with selection state
        const preview: PreviewJob[] = result.data.map(
          (job: Omit<PreviewJob, "selected" | "score_reason">) => ({
            ...job,
            selected: false,
            score_reason: undefined,
          })
        );
        onResults(preview);
        setMessage(`Found ${preview.length} jobs. Scoring with Gemini...`);
      } else {
        setMessage(result.message ?? "No jobs found.");
        onResults([]);
      }
    } catch {
      setMessage("Something went wrong. Check the console.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Source toggles */}
      <div className="flex flex-wrap gap-2">
        {ALL_SOURCES.map((source) => {
          const active = sources.includes(source.id);
          return (
            <button
              key={source.id}
              onClick={() => toggleSource(source.id)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                active
                  ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                  : "border-[var(--sidebar-border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
              }`}
            >
              {source.emoji} {source.label}
            </button>
          );
        })}
      </div>

      {/* Keyword input + scrape trigger — Enter key triggers scrape */}
      <div className="flex gap-2">
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading && keywords.trim()) handleScrape();
          }}
          placeholder="Keywords (comma-separated, e.g. developer, designer)"
          className="flex-1 rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
        />
        <button
          onClick={handleScrape}
          disabled={loading || !keywords.trim()}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          {loading ? "Scraping..." : "Scrape Jobs"}
        </button>
      </div>

      {message && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.includes("Found")
              ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
              : message.includes("No jobs")
                ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
                : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

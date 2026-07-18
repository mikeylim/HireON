"use client";

import { useState, useEffect } from "react";
import { Loader2, MapPin, Zap } from "lucide-react";
import {
  DEFAULT_SEARCH_LOCATION,
  loadSettings,
} from "@/lib/settings";
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
  const [location, setLocation] = useState(DEFAULT_SEARCH_LOCATION);
  const [sources, setSources] = useState<string[]>(
    ALL_SOURCES.map((s) => s.id)
  );

  // Load defaults from settings on mount
  useEffect(() => {
    const settings = loadSettings();
    if (settings.defaultKeywords) setKeywords(settings.defaultKeywords);
    const configuredLocation =
      typeof settings.defaultLocation === "string"
        ? settings.defaultLocation.trim()
        : "";
    setLocation(configuredLocation || DEFAULT_SEARCH_LOCATION);
    if (settings.defaultSources.length > 0) setSources(settings.defaultSources);
  }, []);

  function toggleSource(id: string) {
    setSources((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  async function handleScrape() {
    const searchLocation = location.trim();

    if (sources.length === 0) {
      setMessage("Pick at least one source.");
      return;
    }

    if (!searchLocation) {
      setMessage("Enter a location to search.");
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
          location: searchLocation,
          sources,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage(result.error ?? "Couldn't search for jobs. Please try again.");
        onResults([]);
        return;
      }

      if (result.data && result.data.length > 0) {
        // Turn raw results into preview jobs with selection state
        const preview: PreviewJob[] = result.data.map(
          (job: Omit<PreviewJob, "selected" | "score_reason" | "already_saved">) => ({
            ...job,
            selected: false,
            already_saved: false,
            score_reason: undefined,
          })
        );
        onResults(preview);
        const excludedNote = result.filteredOutCount
          ? ` Excluded ${result.filteredOutCount} outside the selected location.`
          : "";
        setMessage(
          `Found ${preview.length} jobs for ${searchLocation}.${excludedNote} Scoring with Gemini...`
        );
      } else {
        const excludedNote = result.filteredOutCount
          ? ` ${result.filteredOutCount} outside-location result${result.filteredOutCount === 1 ? " was" : "s were"} excluded.`
          : "";
        setMessage(`No jobs found for ${searchLocation}.${excludedNote}`);
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

      {/* Search inputs + scrape trigger — Enter key triggers scrape */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          aria-label="Search keywords"
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !loading &&
              keywords.trim() &&
              location.trim()
            ) {
              handleScrape();
            }
          }}
          placeholder="Keywords (comma-separated, e.g. developer, designer)"
          className="min-w-0 flex-1 rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
        />
        <div className="relative min-w-0 sm:w-56">
          <MapPin
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          />
          <input
            aria-label="Search location"
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !loading &&
                keywords.trim() &&
                location.trim()
              ) {
                handleScrape();
              }
            }}
            placeholder="Location, e.g. Toronto, ON"
            autoComplete="address-level2"
            className="w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] py-2 pl-9 pr-3 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]"
          />
        </div>
        <button
          onClick={handleScrape}
          disabled={loading || !keywords.trim() || !location.trim()}
          className="flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
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

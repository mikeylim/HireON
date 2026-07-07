"use client";

import { useCallback, useState, useEffect } from "react";
import { Save, Loader2, RotateCcw, Settings, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from "@/lib/settings";
import type { ResumeVersion } from "@/lib/types/resume-version";

const ALL_SOURCES = [
  { id: "jobbank", label: "Job Bank Canada" },
  { id: "adzuna", label: "Adzuna" },
  { id: "jooble", label: "Jooble" },
  { id: "remotive", label: "Remotive (Remote)" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";
const labelClass = "block text-sm font-medium mb-1";

function sortResumeVersions(versions: ResumeVersion[]) {
  return [...versions].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
}

function mergeResumeVersion(versions: ResumeVersion[], next: ResumeVersion) {
  const normalized = next.name.toLocaleLowerCase();
  return sortResumeVersions([
    ...versions.filter(
      (version) =>
        version.id !== next.id && version.name.toLocaleLowerCase() !== normalized
    ),
    next,
  ]);
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>([]);
  const [resumeVersionName, setResumeVersionName] = useState("");
  const [resumeVersionsLoading, setResumeVersionsLoading] = useState(false);
  const [resumeVersionsSaving, setResumeVersionsSaving] = useState(false);
  const [resumeVersionsError, setResumeVersionsError] = useState<string | null>(null);
  const [resumeVersionsMessage, setResumeVersionsMessage] = useState<string | null>(null);
  const [deletingResumeVersionId, setDeletingResumeVersionId] = useState<string | null>(null);

  const loadResumeVersions = useCallback(async function loadResumeVersions() {
    setResumeVersionsLoading(true);
    setResumeVersionsError(null);

    try {
      const res = await fetch("/api/resume-versions");
      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error ?? "Failed to load resume versions.");
      }

      setResumeVersions(sortResumeVersions((result.data ?? []) as ResumeVersion[]));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load resume versions.";
      setResumeVersionsError(message);
    } finally {
      setResumeVersionsLoading(false);
    }
  }, []);

  // Load from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
    loadResumeVersions();
  }, [loadResumeVersions]);

  async function handleAddResumeVersion(e: React.FormEvent) {
    e.preventDefault();

    const name = resumeVersionName.trim().replace(/\s+/g, " ");
    if (!name) return;

    setResumeVersionsSaving(true);
    setResumeVersionsError(null);
    setResumeVersionsMessage(null);

    try {
      const res = await fetch("/api/resume-versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error ?? "Failed to save resume version.");
      }

      const version = result.data as ResumeVersion;
      setResumeVersions((prev) => mergeResumeVersion(prev, version));
      setResumeVersionName("");
      setResumeVersionsMessage("Resume version saved.");
      setTimeout(() => setResumeVersionsMessage(null), 2000);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save resume version.";
      setResumeVersionsError(message);
    } finally {
      setResumeVersionsSaving(false);
    }
  }

  async function handleDeleteResumeVersion(version: ResumeVersion) {
    const confirmed = window.confirm(
      `Remove "${version.name}" from future dropdown suggestions? Existing applications will keep their recorded resume version.`
    );
    if (!confirmed) return;

    setDeletingResumeVersionId(version.id);
    setResumeVersionsError(null);
    setResumeVersionsMessage(null);

    try {
      const res = await fetch("/api/resume-versions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: version.id }),
      });
      const result = await res.json();

      if (!res.ok || result.error) {
        throw new Error(result.error ?? "Failed to delete resume version.");
      }

      setResumeVersions((prev) => prev.filter((item) => item.id !== version.id));
      setResumeVersionsMessage("Resume version removed from future suggestions.");
      setTimeout(() => setResumeVersionsMessage(null), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not delete resume version.";
      setResumeVersionsError(message);
    } finally {
      setDeletingResumeVersionId(null);
    }
  }

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function toggleSource(id: string) {
    setSettings((prev) => ({
      ...prev,
      defaultSources: prev.defaultSources.includes(id)
        ? prev.defaultSources.filter((s) => s !== id)
        : [...prev.defaultSources, id],
    }));
    setSaved(false);
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!loaded) return null;

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Settings"
        description="Configure your default search preferences and AI scoring context."
        icon={Settings}
        accent="slate"
      />

      {/* Search defaults */}
      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Search Defaults
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className={labelClass}>Default Keywords</label>
            <input
              type="text"
              value={settings.defaultKeywords}
              onChange={(e) => update("defaultKeywords", e.target.value)}
              placeholder="e.g. developer, designer (comma-separated)"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-[var(--muted)]">
              Pre-filled when you open the All Jobs search.
            </p>
          </div>

          <div>
            <label className={labelClass}>Default Location</label>
            <input
              type="text"
              value={settings.defaultLocation}
              onChange={(e) => update("defaultLocation", e.target.value)}
              placeholder="e.g. Toronto, ON"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Default Score Threshold</label>
          <input
            type="number"
            min={0}
            max={100}
            value={settings.scoreThreshold}
            onChange={(e) => update("scoreThreshold", Number(e.target.value))}
            className={`${inputClass} w-24`}
          />
          <p className="mt-1 text-xs text-[var(--muted)]">
            The default minimum score for &quot;Select above&quot; in preview results.
          </p>
        </div>
      </div>

      {/* Default sources */}
      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          Default Sources
        </h2>
        <p className="text-xs text-[var(--muted)]">
          Which sources are pre-selected when you open the scrape panel.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_SOURCES.map((source) => {
            const active = settings.defaultSources.includes(source.id);
            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source.id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                    : "border-[var(--sidebar-border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                }`}
              >
                {source.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Gemini AI context */}
      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          AI Scoring Context
        </h2>
        <p className="text-xs text-[var(--muted)]">
          This is sent to Gemini when scoring jobs. Describe yourself — your skills, experience level, what you&apos;re looking for, and preferred location.
        </p>
        <textarea
          value={settings.geminiContext}
          onChange={(e) => update("geminiContext", e.target.value)}
          rows={4}
          className={inputClass}
          placeholder="e.g. junior developer with React and Node.js experience, looking for full-stack roles in Toronto..."
        />
      </div>

      {/* Resume versions */}
      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Resume Versions
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Manage reusable names shown in the Application Details dropdown. Removing a
            version only hides it from future suggestions; existing applications keep
            their recorded resume version.
          </p>
        </div>

        <form onSubmit={handleAddResumeVersion} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={resumeVersionName}
            onChange={(e) => setResumeVersionName(e.target.value)}
            placeholder="e.g. Frontend v3, Backend ATS, Resume_v4.pdf"
            maxLength={80}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={resumeVersionsSaving || !resumeVersionName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            {resumeVersionsSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Add
          </button>
        </form>

        {resumeVersionsError && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {resumeVersionsError}
          </p>
        )}
        {resumeVersionsMessage && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {resumeVersionsMessage}
          </p>
        )}

        {resumeVersionsLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading resume versions...</p>
        ) : resumeVersions.length > 0 ? (
          <div className="divide-y divide-[var(--sidebar-border)] rounded-lg border border-[var(--sidebar-border)] bg-[var(--background)]">
            {resumeVersions.map((version) => (
              <div
                key={version.id}
                className="flex items-center justify-between gap-3 px-3 py-2"
              >
                <span className="min-w-0 truncate text-sm font-medium">
                  {version.name}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteResumeVersion(version)}
                  disabled={deletingResumeVersionId === version.id}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-[var(--muted)] transition-colors hover:bg-red-50 hover:text-[var(--destructive)] disabled:opacity-50 dark:hover:bg-red-950"
                >
                  {deletingResumeVersionId === version.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-[var(--sidebar-border)] px-3 py-4 text-sm text-[var(--muted)]">
            No saved resume versions yet. Typing one in a job&apos;s Application
            Details will add it here automatically after you save.
          </p>
        )}
      </div>

      {/* Save / Reset */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)]"
        >
          {saved ? (
            <Loader2 className="h-4 w-4" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saved ? "Saved!" : "Save Settings"}
        </button>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 rounded-lg border border-[var(--sidebar-border)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, RotateCcw } from "lucide-react";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from "@/lib/settings";

const ALL_SOURCES = [
  { id: "jobbank", label: "Job Bank Canada" },
  { id: "adzuna", label: "Adzuna" },
  { id: "jooble", label: "Jooble" },
  { id: "remotive", label: "Remotive (Remote)" },
];

const inputClass =
  "w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";
const labelClass = "block text-sm font-medium mb-1";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);
  }, []);

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
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-[var(--muted)]">
          Configure your default search preferences and AI scoring context.
        </p>
      </div>

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

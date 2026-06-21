"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, AlertCircle, PlusCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import type { JobStatus, JobType, WorkMode } from "@/lib/types/job";

// All the fields the user can fill in when adding a job manually
type SalaryPeriod = "annual" | "monthly" | "hourly";

interface FormData {
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  description: string;
  job_type: JobType;
  work_mode: WorkMode;
  status: JobStatus;
  salary_min: string;
  salary_max: string;
  salary_period: SalaryPeriod;
  deadline: string;
  notes: string;
  has_duration: boolean;     // whether the contract/internship/temp has a fixed duration
  duration_value: string;    // e.g. "6"
  duration_unit: "months" | "years";
}

const INITIAL_FORM: FormData = {
  title: "",
  company: "",
  location: "Toronto, ON",
  url: "",
  source: "",
  description: "",
  job_type: "full-time",
  work_mode: "onsite",
  status: "saved",
  salary_min: "",
  salary_max: "",
  salary_period: "annual",
  deadline: "",
  notes: "",
  has_duration: false,
  duration_value: "",
  duration_unit: "months",
};

// Dropdown options
const JOB_TYPES: { value: JobType; label: string }[] = [
  { value: "full-time", label: "Full-time" },
  { value: "part-time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
];

const WORK_MODES: { value: WorkMode; label: string }[] = [
  { value: "onsite", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
];

const STATUSES: { value: JobStatus; label: string }[] = [
  { value: "saved", label: "Saved" },
  { value: "applied", label: "Applied" },
  { value: "interview", label: "Interview" },
  { value: "offer", label: "Offer" },
];

// Common sources for the dropdown hint — user can also type their own
const SOURCE_SUGGESTIONS = [
  "Indeed",
  "Glassdoor",
  "LinkedIn",
  "University Career Portal",
  "Company Website",
  "Referral",
  "Job Fair",
  "Other",
];

export default function AddJobPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI auto-fill state
  const [parseUrl, setParseUrl] = useState("");
  const [parseText, setParseText] = useState("");
  const [parseMode, setParseMode] = useState<"url" | "text">("url");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseWarning, setParseWarning] = useState<string | null>(null);
  // Tracks which fields were filled by AI — used for showing the "AI" badge.
  // Once a user edits a field, we remove it from this set so the badge disappears.
  const [aiFilled, setAiFilled] = useState<Set<keyof FormData>>(new Set());

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // User just modified this field — it's no longer "AI-filled"
    setAiFilled((prev) => {
      if (!prev.has(field)) return prev;
      const next = new Set(prev);
      next.delete(field);
      return next;
    });
  }

  // Handle AI parse: send URL to server, fill in the form with returned data
  async function handleParseUrl() {
    // Validate input based on current mode
    if (parseMode === "url" && !parseUrl.trim()) {
      setParseError("Paste a job posting URL first.");
      return;
    }
    if (parseMode === "text" && !parseText.trim()) {
      setParseError("Paste the job description text first.");
      return;
    }

    setParsing(true);
    setParseError(null);
    setParseWarning(null);

    try {
      // Send either url or text depending on mode
      const payload =
        parseMode === "url"
          ? { url: parseUrl.trim() }
          : { text: parseText.trim() };

      const res = await fetch("/api/jobs/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok || result.error) {
        setParseError(result.error ?? "Failed to parse this URL.");
        return;
      }

      const data = result.data;
      const filledFields = new Set<keyof FormData>();

      // Build the new form state, only overwriting fields that came back non-null
      setForm((prev) => {
        const next = { ...prev };

        // If user provided a URL, save it. In text mode, leave URL field for user to fill in.
        if (parseMode === "url") {
          next.url = parseUrl.trim();
          filledFields.add("url");
        }

        if (data.title) { next.title = data.title; filledFields.add("title"); }
        if (data.company) { next.company = data.company; filledFields.add("company"); }
        if (data.location) { next.location = data.location; filledFields.add("location"); }
        if (data.description) { next.description = data.description; filledFields.add("description"); }
        if (data.job_type) { next.job_type = data.job_type; filledFields.add("job_type"); }
        if (data.work_mode) { next.work_mode = data.work_mode; filledFields.add("work_mode"); }
        if (data.salary_min !== null) { next.salary_min = String(data.salary_min); filledFields.add("salary_min"); }
        if (data.salary_max !== null) { next.salary_max = String(data.salary_max); filledFields.add("salary_max"); }
        if (data.salary_period) { next.salary_period = data.salary_period; filledFields.add("salary_period"); }
        if (data.deadline) { next.deadline = data.deadline; filledFields.add("deadline"); }
        if (data.duration_value !== null) {
          next.duration_value = String(data.duration_value);
          next.has_duration = true;
          filledFields.add("duration_value");
          filledFields.add("has_duration");
        }
        if (data.duration_unit) { next.duration_unit = data.duration_unit; filledFields.add("duration_unit"); }
        if (data.notes) { next.notes = data.notes; filledFields.add("notes"); }

        return next;
      });

      setAiFilled(filledFields);
      if (result.warning) setParseWarning(result.warning);
    } catch {
      setParseError("Something went wrong. Check your connection and try again.");
    } finally {
      setParsing(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!form.title.trim()) return setError("Job title is required.");
    if (!form.company.trim()) return setError("Company name is required.");
    if (!form.url.trim()) return setError("Job posting URL is required.");
    if (!form.source.trim()) return setError("Source is required.");

    setSaving(true);

    // Convert salary to annual for consistent storage
    const toAnnual = (val: string): number | null => {
      if (!val) return null;
      const num = parseFloat(val);
      if (isNaN(num)) return null;
      switch (form.salary_period) {
        case "hourly":
          return Math.round(num * 40 * 52); // 40hrs/week, 52 weeks
        case "monthly":
          return Math.round(num * 12);
        default:
          return Math.round(num);
      }
    };

    // Build duration string if applicable (e.g. "6 months contract")
    const durationNote =
      form.has_duration && form.duration_value
        ? `Duration: ${form.duration_value} ${form.duration_unit}`
        : "";

    // Combine user notes with duration info
    const notes = [durationNote, form.notes.trim()].filter(Boolean).join("\n");

    const res = await fetch("/api/jobs/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim() || "Toronto, ON",
        url: form.url.trim(),
        source: form.source.toLowerCase().trim(),
        description: form.description.trim(),
        job_type: form.job_type,
        work_mode: form.work_mode,
        status: form.status,
        salary_min: toAnnual(form.salary_min),
        salary_max: toAnnual(form.salary_max),
        deadline: form.deadline || null,
        notes,
        tags: [],
      }),
    });

    const result = await res.json();
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    // Redirect to the relevant page based on the status they chose
    if (form.status === "applied") {
      router.push("/dashboard/applied");
    } else if (form.status === "interview") {
      router.push("/dashboard/interviews");
    } else {
      router.push("/dashboard/saved");
    }
  }

  const inputClass =
    "w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]";
  const labelClass = "block text-sm font-medium mb-1";

  // Small badge shown next to labels of fields that were auto-filled by AI
  // Disappears once the user edits the field (handled in `update()`)
  function AIBadge({ field }: { field: keyof FormData }) {
    if (!aiFilled.has(field)) return null;
    return (
      <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-bold text-[var(--primary)]">
        <Sparkles className="h-2.5 w-2.5" />
        AI
      </span>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <PageHeader
        title="Add Job Manually"
        description="Track a job you found on Indeed, Glassdoor, a university portal, or anywhere else."
        icon={PlusCircle}
        accent="indigo"
      />

      {/* ── AI Auto-fill ── */}
      <div className="rounded-xl border border-[var(--primary)]/30 bg-blue-50/50 p-5 space-y-3 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 shrink-0 text-[var(--primary)]" />
          <div className="flex-1">
            <h2 className="text-sm font-semibold">Auto-fill with AI</h2>
            <p className="mt-0.5 text-xs text-[var(--muted)]">
              Paste a job posting URL, or if that doesn&apos;t work for the site, paste the description text directly.{" "}
              <span className="font-medium">Always review before saving.</span>
            </p>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="inline-flex rounded-lg border border-[var(--sidebar-border)] bg-[var(--background)] p-0.5">
          <button
            type="button"
            onClick={() => { setParseMode("url"); setParseError(null); }}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              parseMode === "url"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            From URL
          </button>
          <button
            type="button"
            onClick={() => { setParseMode("text"); setParseError(null); }}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              parseMode === "text"
                ? "bg-[var(--primary)] text-white"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            From Pasted Text
          </button>
        </div>

        {parseMode === "url" ? (
          <div className="flex gap-2">
            <input
              type="url"
              value={parseUrl}
              onChange={(e) => setParseUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!parsing && parseUrl.trim()) handleParseUrl();
                }
              }}
              placeholder="https://company.com/careers/job-id"
              className="flex-1 rounded-lg border border-[var(--sidebar-border)] bg-[var(--background)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
            />
            <button
              type="button"
              onClick={handleParseUrl}
              disabled={parsing || !parseUrl.trim()}
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {parsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {parsing ? "Analyzing..." : "Auto-fill"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <textarea
              value={parseText}
              onChange={(e) => setParseText(e.target.value)}
              placeholder="Paste the full job description here — copy the text from the job posting page (title, company, salary, deadline, responsibilities, etc.)"
              rows={8}
              className="w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--background)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-[var(--muted)]">
                {parseText.length} characters {parseText.length < 100 && parseText.length > 0 && "— paste more for better results"}
              </p>
              <button
                type="button"
                onClick={handleParseUrl}
                disabled={parsing || parseText.trim().length < 100}
                className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
              >
                {parsing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {parsing ? "Analyzing..." : "Auto-fill from Text"}
              </button>
            </div>
          </div>
        )}

        {parseError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{parseError}</p>
          </div>
        )}
        {parseWarning && (
          <div className="flex items-start gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-sm text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{parseWarning}</p>
          </div>
        )}
        {aiFilled.size > 0 && !parseError && (
          <p className="text-xs text-[var(--success)]">
            Filled {aiFilled.size} field{aiFilled.size !== 1 ? "s" : ""} from the URL. Review and edit any fields marked with the AI badge below.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Required fields ── */}
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Job Details
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Job Title *<AIBadge field="title" /></label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Full Stack Developer"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Company *<AIBadge field="company" /></label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                placeholder="e.g. Shopify"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Posting URL *<AIBadge field="url" /></label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => update("url", e.target.value)}
                placeholder="https://..."
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Source *</label>
              <input
                type="text"
                list="source-suggestions"
                value={form.source}
                onChange={(e) => update("source", e.target.value)}
                placeholder="Where did you find this?"
                className={inputClass}
              />
              <datalist id="source-suggestions">
                {SOURCE_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <label className={labelClass}>Location<AIBadge field="location" /></label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Toronto, ON"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Application Deadline<AIBadge field="deadline" /></label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => update("deadline", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Job Description<AIBadge field="description" /></label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Paste or summarize the job description..."
              rows={4}
              className={inputClass}
            />
          </div>
        </div>

        {/* ── Classification ── */}
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Classification
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Job Type<AIBadge field="job_type" /></label>
              <select
                value={form.job_type}
                onChange={(e) => {
                  update("job_type", e.target.value);
                  // Reset duration fields when switching away from contract/internship/temp
                  if (["full-time", "part-time"].includes(e.target.value)) {
                    setForm((prev) => ({ ...prev, has_duration: false, duration_value: "", duration_unit: "months" }));
                  }
                }}
                className={inputClass}
              >
                {JOB_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Work Mode<AIBadge field="work_mode" /></label>
              <select
                value={form.work_mode}
                onChange={(e) => update("work_mode", e.target.value)}
                className={inputClass}
              >
                {WORK_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Status</label>
              <select
                value={form.status}
                onChange={(e) => update("status", e.target.value)}
                className={inputClass}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration fields — only show for contract, internship, temporary */}
          {["contract", "internship", "temporary"].includes(form.job_type) && (
            <div className="space-y-3 rounded-lg border border-[var(--sidebar-border)] bg-[var(--background)] p-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.has_duration}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, has_duration: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-[var(--sidebar-border)] accent-[var(--primary)]"
                />
                This position has a fixed duration
              </label>

              {form.has_duration && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={form.duration_value}
                    onChange={(e) => update("duration_value", e.target.value)}
                    placeholder="e.g. 6"
                    className={`${inputClass} w-24`}
                  />
                  <select
                    value={form.duration_unit}
                    onChange={(e) => update("duration_unit", e.target.value)}
                    className={`${inputClass} w-28`}
                  >
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Salary & Notes ── */}
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Salary &amp; Notes
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Pay Period<AIBadge field="salary_period" /></label>
              <select
                value={form.salary_period}
                onChange={(e) => update("salary_period", e.target.value)}
                className={inputClass}
              >
                <option value="annual">Annual</option>
                <option value="monthly">Monthly</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Min ({form.salary_period === "hourly" ? "$/hr" : form.salary_period === "monthly" ? "$/mo" : "$/yr"})
                <AIBadge field="salary_min" />
              </label>
              <input
                type="number"
                value={form.salary_min}
                onChange={(e) => update("salary_min", e.target.value)}
                placeholder={form.salary_period === "hourly" ? "e.g. 25" : form.salary_period === "monthly" ? "e.g. 4000" : "e.g. 50000"}
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Max ({form.salary_period === "hourly" ? "$/hr" : form.salary_period === "monthly" ? "$/mo" : "$/yr"})
                <AIBadge field="salary_max" />
              </label>
              <input
                type="number"
                value={form.salary_max}
                onChange={(e) => update("salary_max", e.target.value)}
                placeholder={form.salary_period === "hourly" ? "e.g. 40" : form.salary_period === "monthly" ? "e.g. 6000" : "e.g. 80000"}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes<AIBadge field="notes" /></label>
            <textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Any personal notes — referral contact, interview prep, etc."
              rows={3}
              className={inputClass}
            />
          </div>
        </div>

        {/* ── Error + Submit ── */}
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Add Job"}
        </button>
      </form>
    </div>
  );
}

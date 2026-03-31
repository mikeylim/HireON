"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
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

  function update(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    const { error: dbError } = await supabase.from("jobs").upsert(
      {
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
      },
      { onConflict: "url", ignoreDuplicates: false }
    );

    setSaving(false);

    if (dbError) {
      setError(dbError.message);
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

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Add Job Manually</h1>
        <p className="text-sm text-[var(--muted)]">
          Track a job you found on Indeed, Glassdoor, a university portal, or anywhere else.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* ── Required fields ── */}
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Job Details
          </h2>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={labelClass}>Job Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="e.g. Full Stack Developer"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Company *</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                placeholder="e.g. Shopify"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Posting URL *</label>
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
              <label className={labelClass}>Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => update("location", e.target.value)}
                placeholder="e.g. Toronto, ON"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>Application Deadline</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => update("deadline", e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Job Description</label>
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
              <label className={labelClass}>Job Type</label>
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
              <label className={labelClass}>Work Mode</label>
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
              <label className={labelClass}>Pay Period</label>
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
            <label className={labelClass}>Notes</label>
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

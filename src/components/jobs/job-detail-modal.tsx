"use client";

import { useState, useEffect } from "react";
import {
  X,
  ExternalLink,
  Loader2,
  Bookmark,
  Send,
  CalendarClock,
  Trophy,
  XCircle,
  Archive,
  Trash2,
  Pencil,
} from "lucide-react";
import type { Job, JobStatus } from "@/lib/types/job";
import { titleCase } from "@/lib/utils";

const STATUS_ACTIONS: {
  value: JobStatus;
  label: string;
  icon: typeof Bookmark;
}[] = [
  { value: "saved", label: "Saved", icon: Bookmark },
  { value: "applied", label: "Applied", icon: Send },
  { value: "interview", label: "Interview", icon: CalendarClock },
  { value: "offer", label: "Offer", icon: Trophy },
  { value: "rejected", label: "Rejected", icon: XCircle },
  { value: "archived", label: "Archived", icon: Archive },
];

const INTERVIEW_TYPES = ["phone", "video", "onsite", "technical", "behavioral", "panel", "other"];

function convertToAnnual(amount: number, period: "annual" | "monthly" | "hourly"): number {
  if (period === "hourly") return Math.round(amount * 40 * 52);
  if (period === "monthly") return Math.round(amount * 12);
  return Math.round(amount);
}

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  onUpdate: (updatedJob: Job) => void;
  onDelete: (id: string) => void;
}

const inputClass =
  "w-full rounded-lg border border-[var(--sidebar-border)] bg-[var(--accent)] px-3 py-2 text-sm outline-none placeholder:text-[var(--muted)] focus:border-[var(--primary)]";
const labelClass = "block text-xs font-medium text-[var(--muted)] mb-1";

export function JobDetailModal({
  job,
  onClose,
  onUpdate,
  onDelete,
}: JobDetailModalProps) {
  // Core job fields — editable
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(job.title ?? "");
  const [company, setCompany] = useState(job.company ?? "");
  const [location, setLocation] = useState(job.location ?? "");
  const [jobUrl, setJobUrl] = useState(job.url ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [deadline, setDeadline] = useState(job.deadline?.slice(0, 10) ?? "");

  // General fields
  const [notes, setNotes] = useState(job.notes ?? "");

  // Interview fields
  const [interviewDate, setInterviewDate] = useState(job.interview_date?.slice(0, 16) ?? "");
  const [interviewType, setInterviewType] = useState(job.interview_type ?? "");
  const [interviewLocation, setInterviewLocation] = useState(job.interview_location ?? "");
  const [interviewContact, setInterviewContact] = useState(job.interview_contact ?? "");
  const [interviewPrep, setInterviewPrep] = useState(job.interview_prep ?? "");

  // Applied fields
  const [appliedDate, setAppliedDate] = useState(job.applied_date?.slice(0, 10) ?? "");
  const [appliedMethod, setAppliedMethod] = useState(job.applied_method ?? "");
  const [appliedResumeVersion, setAppliedResumeVersion] = useState(job.applied_resume_version ?? "");
  const [appliedCoverLetter, setAppliedCoverLetter] = useState(job.applied_cover_letter ?? false);
  const [appliedReferral, setAppliedReferral] = useState(job.applied_referral ?? "");
  const [appliedFollowUpDate, setAppliedFollowUpDate] = useState(job.applied_follow_up_date?.slice(0, 10) ?? "");

  // Offer fields
  const [offerAmount, setOfferAmount] = useState(job.offer_amount?.toString() ?? "");
  const [offerSalaryPeriod, setOfferSalaryPeriod] = useState<"annual" | "monthly" | "hourly">("annual");
  const [offerDate, setOfferDate] = useState(job.offer_date?.slice(0, 10) ?? "");
  const [offerDeadline, setOfferDeadline] = useState(job.offer_deadline?.slice(0, 10) ?? "");

  // Rejection fields
  const [rejectionReason, setRejectionReason] = useState(job.rejection_reason ?? "");
  const [rejectedDate, setRejectedDate] = useState(job.rejected_date?.slice(0, 10) ?? "");

  // Archive fields
  const [archiveReason, setArchiveReason] = useState(job.archive_reason ?? "");
  const [archivedDate, setArchivedDate] = useState(job.archived_date?.slice(0, 10) ?? "");

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Sync local state when the job prop changes (e.g. after a status update)
  useEffect(() => {
    setTitle(job.title ?? "");
    setCompany(job.company ?? "");
    setLocation(job.location ?? "");
    setJobUrl(job.url ?? "");
    setDescription(job.description ?? "");
    setDeadline(job.deadline?.slice(0, 10) ?? "");
    setEditing(false);
    setNotes(job.notes ?? "");
    setAppliedDate(job.applied_date?.slice(0, 10) ?? "");
    setAppliedMethod(job.applied_method ?? "");
    setAppliedResumeVersion(job.applied_resume_version ?? "");
    setAppliedCoverLetter(job.applied_cover_letter ?? false);
    setAppliedReferral(job.applied_referral ?? "");
    setAppliedFollowUpDate(job.applied_follow_up_date?.slice(0, 10) ?? "");
    setInterviewDate(job.interview_date?.slice(0, 16) ?? "");
    setInterviewType(job.interview_type ?? "");
    setInterviewLocation(job.interview_location ?? "");
    setInterviewContact(job.interview_contact ?? "");
    setInterviewPrep(job.interview_prep ?? "");
    setOfferAmount(job.offer_amount?.toString() ?? "");
    setOfferDate(job.offer_date?.slice(0, 10) ?? "");
    setOfferDeadline(job.offer_deadline?.slice(0, 10) ?? "");
    setRejectionReason(job.rejection_reason ?? "");
    setRejectedDate(job.rejected_date?.slice(0, 10) ?? "");
    setArchiveReason(job.archive_reason ?? "");
    setArchivedDate(job.archived_date?.slice(0, 10) ?? "");
  }, [job]);

  // Generic update helper
  async function updateJob(updates: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch("/api/jobs/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: job.id, updates }),
      });
      const result = await res.json();
      if (result.data) onUpdate(result.data);
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setSaving(false);
    }
  }

  // Status change — also auto-sets relevant date fields
  async function handleStatusChange(newStatus: JobStatus) {
    const updates: Record<string, unknown> = { status: newStatus };

    // Auto-populate date fields on status transitions
    const now = new Date().toISOString();
    if (newStatus === "applied" && !job.applied_date) {
      updates.applied_date = now;
    }
    if (newStatus === "rejected" && !job.rejected_date) {
      updates.rejected_date = now;
    }
    if (newStatus === "archived" && !job.archived_date) {
      updates.archived_date = now;
    }
    if (newStatus === "offer" && !job.offer_date) {
      updates.offer_date = now;
    }

    await updateJob(updates);
  }

  // Save all editable fields at once
  async function handleSaveDetails() {
    const updates: Record<string, unknown> = {
      title: title.trim(),
      company: company.trim(),
      location: location.trim(),
      url: jobUrl.trim(),
      description: description.trim(),
      deadline: deadline || null,
      notes,
      applied_date: appliedDate || null,
      applied_method: appliedMethod || null,
      applied_resume_version: appliedResumeVersion || null,
      applied_cover_letter: appliedCoverLetter,
      applied_referral: appliedReferral || null,
      applied_follow_up_date: appliedFollowUpDate || null,
      interview_date: interviewDate || null,
      interview_type: interviewType || null,
      interview_location: interviewLocation || null,
      interview_contact: interviewContact || null,
      interview_prep: interviewPrep || null,
      offer_amount: offerAmount ? convertToAnnual(parseFloat(offerAmount), offerSalaryPeriod) : null,
      offer_date: offerDate || null,
      offer_deadline: offerDeadline || null,
      rejection_reason: rejectionReason || null,
      rejected_date: rejectedDate || null,
      archive_reason: archiveReason || null,
      archived_date: archivedDate || null,
    };
    await updateJob(updates);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await fetch("/api/jobs/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [job.id] }),
      });
      onDelete(job.id);
      onClose();
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setDeleting(false);
    }
  }

  // Check if any field has changed from the original job
  const hasChanges =
    title !== (job.title ?? "") ||
    company !== (job.company ?? "") ||
    location !== (job.location ?? "") ||
    jobUrl !== (job.url ?? "") ||
    description !== (job.description ?? "") ||
    deadline !== (job.deadline?.slice(0, 10) ?? "") ||
    notes !== (job.notes ?? "") ||
    appliedDate !== (job.applied_date?.slice(0, 10) ?? "") ||
    appliedMethod !== (job.applied_method ?? "") ||
    appliedResumeVersion !== (job.applied_resume_version ?? "") ||
    appliedCoverLetter !== (job.applied_cover_letter ?? false) ||
    appliedReferral !== (job.applied_referral ?? "") ||
    appliedFollowUpDate !== (job.applied_follow_up_date?.slice(0, 10) ?? "") ||
    interviewDate !== (job.interview_date?.slice(0, 16) ?? "") ||
    interviewType !== (job.interview_type ?? "") ||
    interviewLocation !== (job.interview_location ?? "") ||
    interviewContact !== (job.interview_contact ?? "") ||
    interviewPrep !== (job.interview_prep ?? "") ||
    offerAmount !== (job.offer_amount?.toString() ?? "") ||
    offerDate !== (job.offer_date?.slice(0, 10) ?? "") ||
    offerDeadline !== (job.offer_deadline?.slice(0, 10) ?? "") ||
    rejectionReason !== (job.rejection_reason ?? "") ||
    rejectedDate !== (job.rejected_date?.slice(0, 10) ?? "") ||
    archiveReason !== (job.archive_reason ?? "") ||
    archivedDate !== (job.archived_date?.slice(0, 10) ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4">
      <div className="relative max-h-[95vh] w-full overflow-y-auto rounded-t-2xl border border-[var(--sidebar-border)] bg-[var(--background)] p-4 shadow-xl sm:max-w-2xl sm:rounded-2xl sm:p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header — toggles between view and edit mode */}
        <div className="pr-10">
          {editing ? (
            <div className="space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={`${inputClass} text-lg font-bold`}
                placeholder="Job title"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className={inputClass}
                  placeholder="Company"
                />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className={inputClass}
                  placeholder="Location"
                />
              </div>
              <input
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                className={inputClass}
                placeholder="Job posting URL"
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Application Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">{titleCase(title || job.title)}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {company || job.company} · {location || job.location}
                </p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                title="Edit job details"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Metadata badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs text-[var(--muted)]">
            {job.source}
          </span>
          {job.job_type && (
            <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs text-[var(--muted)]">
              {job.job_type}
            </span>
          )}
          {job.work_mode && job.work_mode !== "onsite" && (
            <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs text-[var(--muted)]">
              {job.work_mode}
            </span>
          )}
          {job.salary_min && (
            <span className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs text-[var(--muted)]">
              ${(job.salary_min / 1000).toFixed(0)}k
              {job.salary_max ? `–$${(job.salary_max / 1000).toFixed(0)}k` : "+"}
            </span>
          )}
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
              Score: {job.relevance_score}
            </span>
          )}
        </div>

        {/* Link to posting */}
        {!editing && (jobUrl || job.url) && (
          <a
            href={jobUrl || job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] hover:underline"
          >
            View original posting <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}

        {/* Description */}
        {editing ? (
          <div className="mt-4">
            <h3 className="text-sm font-semibold">Description</h3>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={`mt-1 ${inputClass}`}
              placeholder="Job description..."
            />
          </div>
        ) : (
          (description || job.description) && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">Description</h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">
                {description || job.description}
              </p>
            </div>
          )
        )}

        {/* ── Status buttons ── */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Status</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {STATUS_ACTIONS.map((action) => {
              const isActive = job.status === action.value;
              return (
                <button
                  key={action.value}
                  onClick={() => handleStatusChange(action.value)}
                  disabled={saving || isActive}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--sidebar-border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                  } disabled:opacity-50`}
                >
                  <action.icon className="h-3.5 w-3.5" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Applied details — shown when status is applied ── */}
        {job.status === "applied" && (
          <div className="mt-5 space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
            <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              Application Details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>How did you apply?</label>
                <select
                  value={appliedMethod}
                  onChange={(e) => setAppliedMethod(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select method...</option>
                  <option value="company_website">Company Website</option>
                  <option value="linkedin_easy_apply">LinkedIn Easy Apply</option>
                  <option value="email">Email</option>
                  <option value="referral">Referral</option>
                  <option value="job_portal">Job Portal (Indeed, etc.)</option>
                  <option value="in_person">In Person / Job Fair</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Resume Version</label>
                <input
                  type="text"
                  value={appliedResumeVersion}
                  onChange={(e) => setAppliedResumeVersion(e.target.value)}
                  placeholder="e.g. Resume_v3_Frontend.pdf"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Referral Contact</label>
                <input
                  type="text"
                  value={appliedReferral}
                  onChange={(e) => setAppliedReferral(e.target.value)}
                  placeholder="Name, email, or relationship"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Follow-up Date</label>
                <input
                  type="date"
                  value={appliedFollowUpDate}
                  onChange={(e) => setAppliedFollowUpDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={appliedCoverLetter}
                onChange={(e) => setAppliedCoverLetter(e.target.checked)}
                className="h-4 w-4 rounded border-[var(--sidebar-border)] accent-[var(--primary)]"
              />
              Submitted a cover letter
            </label>
            <div>
              <label className={labelClass}>Date Applied</label>
              <input
                type="date"
                value={appliedDate}
                onChange={(e) => setAppliedDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* ── Interview details — shown when status is interview ── */}
        {job.status === "interview" && (
          <div className="mt-5 space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
            <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
              Interview Details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Date &amp; Time</label>
                <input
                  type="datetime-local"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Interview Type</label>
                <select
                  value={interviewType}
                  onChange={(e) => setInterviewType(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select type...</option>
                  {INTERVIEW_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Location / Link</label>
                <input
                  type="text"
                  value={interviewLocation}
                  onChange={(e) => setInterviewLocation(e.target.value)}
                  placeholder="Office address or Zoom/Teams link"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Contact Person</label>
                <input
                  type="text"
                  value={interviewContact}
                  onChange={(e) => setInterviewContact(e.target.value)}
                  placeholder="Interviewer name, email, or phone"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Prep Notes &amp; Links</label>
              <textarea
                value={interviewPrep}
                onChange={(e) => setInterviewPrep(e.target.value)}
                placeholder="Company research, questions to ask, portfolio links, practice problems..."
                rows={3}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* ── Offer details — shown when status is offer ── */}
        {job.status === "offer" && (
          <div className="mt-5 space-y-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">
              Offer Details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>Pay Period</label>
                <select
                  value={offerSalaryPeriod}
                  onChange={(e) => setOfferSalaryPeriod(e.target.value as "annual" | "monthly" | "hourly")}
                  className={inputClass}
                >
                  <option value="annual">Annual</option>
                  <option value="monthly">Monthly</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Offered Amount ({offerSalaryPeriod === "hourly" ? "$/hr" : offerSalaryPeriod === "monthly" ? "$/mo" : "$/yr"})
                </label>
                <input
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder={offerSalaryPeriod === "hourly" ? "e.g. 40" : offerSalaryPeriod === "monthly" ? "e.g. 6000" : "e.g. 75000"}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Response Deadline</label>
                <input
                  type="date"
                  value={offerDeadline}
                  onChange={(e) => setOfferDeadline(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Date Received</label>
                <input
                  type="date"
                  value={offerDate}
                  onChange={(e) => setOfferDate(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Rejection details — shown when status is rejected ── */}
        {job.status === "rejected" && (
          <div className="mt-5 space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
              Rejection Details
            </h3>
            <div>
              <label className={labelClass}>Reason</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className={inputClass}
              >
                <option value="">Select reason...</option>
                <option value="no_response">No response / Ghosted</option>
                <option value="not_selected">Not selected after interview</option>
                <option value="failed_technical">Failed technical assessment</option>
                <option value="position_filled">Position already filled</option>
                <option value="not_qualified">Not qualified</option>
                <option value="withdrew">I withdrew my application</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date Rejected</label>
              <input
                type="date"
                value={rejectedDate}
                onChange={(e) => setRejectedDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* ── Archive details — shown when status is archived ── */}
        {job.status === "archived" && (
          <div className="mt-5 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Archive Details
            </h3>
            <div>
              <label className={labelClass}>Reason for archiving</label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className={inputClass}
              >
                <option value="">Select reason...</option>
                <option value="posting_expired">Job posting expired</option>
                <option value="position_filled">Position already filled</option>
                <option value="not_interested">No longer interested</option>
                <option value="declined_offer">Declined the offer</option>
                <option value="ghosted">Ghosted after applying</option>
                <option value="underqualified">Underqualified for the role</option>
                <option value="overqualified">Overqualified for the role</option>
                <option value="low_salary">Salary too low</option>
                <option value="bad_reviews">Bad company reviews</option>
                <option value="found_better">Found a better opportunity</option>
                <option value="duplicate">Duplicate posting</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Date Archived</label>
              <input
                type="date"
                value={archivedDate}
                onChange={(e) => setArchivedDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}

        {/* ── Notes — always visible ── */}
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Notes</h3>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Referral contacts, follow-up reminders, anything useful..."
            rows={3}
            className={`mt-2 ${inputClass}`}
          />
        </div>

        {/* Save all changes button */}
        <button
          onClick={handleSaveDetails}
          disabled={saving || !hasChanges}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Changes
        </button>

        {/* Timeline dates */}
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-1 text-xs text-[var(--muted)]">
          {job.posted_at && (
            <span>Posted: {new Date(job.posted_at).toLocaleDateString()}</span>
          )}
          {job.deadline && (
            <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
          )}
          {job.applied_date && (
            <span>Applied: {new Date(job.applied_date).toLocaleDateString()}</span>
          )}
          {job.interview_date && (
            <span>Interview: {new Date(job.interview_date).toLocaleDateString()}</span>
          )}
          {job.offer_date && (
            <span>Offer: {new Date(job.offer_date).toLocaleDateString()}</span>
          )}
          <span>Added: {new Date(job.scraped_at).toLocaleDateString()}</span>
        </div>

        {/* Delete */}
        <div className="mt-5 border-t border-[var(--sidebar-border)] pt-4">
          {confirmDelete ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-[var(--destructive)]">
                Delete this job permanently?
              </span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--destructive)] px-3 py-1.5 text-xs font-medium text-white"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="rounded-lg border border-[var(--sidebar-border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)]"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 text-xs text-[var(--muted)] hover:text-[var(--destructive)]"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

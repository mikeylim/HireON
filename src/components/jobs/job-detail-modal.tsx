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
  FileText,
  Briefcase,
  History,
  StickyNote,
} from "lucide-react";
import type { Job, JobStatus } from "@/lib/types/job";
import { titleCase, parseDate, todayLocal } from "@/lib/utils";
import { ApplicationTimeline, type ClearableField } from "./application-timeline";

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

type Tab = "overview" | "application" | "timeline" | "notes";

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
  // ── State ────────────────────────────────────────────────────────────────

  const [tab, setTab] = useState<Tab>("overview");

  // Core job fields
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(job.title ?? "");
  const [company, setCompany] = useState(job.company ?? "");
  const [location, setLocation] = useState(job.location ?? "");
  const [jobUrl, setJobUrl] = useState(job.url ?? "");
  const [description, setDescription] = useState(job.description ?? "");
  const [deadline, setDeadline] = useState(job.deadline?.slice(0, 10) ?? "");

  // Notes
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

  // ── Effects ──────────────────────────────────────────────────────────────

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Sync local state when job prop updates (e.g., after a status change)
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

  // ── Handlers ─────────────────────────────────────────────────────────────

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

  async function handleStatusChange(newStatus: JobStatus) {
    const updates: Record<string, unknown> = { status: newStatus };
    // Use local calendar date (e.g. "2026-05-22") instead of an ISO timestamp.
    // The status dates are conceptually calendar days, not moments in time —
    // using ISO would cause "applied today" to render as "tomorrow" when the
    // user is in evening local time (UTC date is a day ahead).
    const today = todayLocal();
    if (newStatus === "applied" && !job.applied_date) updates.applied_date = today;
    if (newStatus === "rejected" && !job.rejected_date) updates.rejected_date = today;
    if (newStatus === "archived" && !job.archived_date) updates.archived_date = today;
    if (newStatus === "offer" && !job.offer_date) updates.offer_date = today;
    await updateJob(updates);
    // Auto-jump to the Application tab so the user sees the new status's details
    if (newStatus !== "saved" && newStatus !== "new") setTab("application");
  }

  async function handleClearTimelineEvent(field: ClearableField) {
    await updateJob({ [field]: null });
  }

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

  // ── Change tracking ──────────────────────────────────────────────────────
  // Build a list of CHANGED FIELD LABELS so the Save button can show
  // a count and the user knows what's pending.
  const changes: string[] = [];
  if (title !== (job.title ?? "")) changes.push("title");
  if (company !== (job.company ?? "")) changes.push("company");
  if (location !== (job.location ?? "")) changes.push("location");
  if (jobUrl !== (job.url ?? "")) changes.push("URL");
  if (description !== (job.description ?? "")) changes.push("description");
  if (deadline !== (job.deadline?.slice(0, 10) ?? "")) changes.push("deadline");
  if (notes !== (job.notes ?? "")) changes.push("notes");
  if (appliedDate !== (job.applied_date?.slice(0, 10) ?? "")) changes.push("applied date");
  if (appliedMethod !== (job.applied_method ?? "")) changes.push("application method");
  if (appliedResumeVersion !== (job.applied_resume_version ?? "")) changes.push("resume version");
  if (appliedCoverLetter !== (job.applied_cover_letter ?? false)) changes.push("cover letter");
  if (appliedReferral !== (job.applied_referral ?? "")) changes.push("referral");
  if (appliedFollowUpDate !== (job.applied_follow_up_date?.slice(0, 10) ?? "")) changes.push("follow-up date");
  if (interviewDate !== (job.interview_date?.slice(0, 16) ?? "")) changes.push("interview date");
  if (interviewType !== (job.interview_type ?? "")) changes.push("interview type");
  if (interviewLocation !== (job.interview_location ?? "")) changes.push("interview location");
  if (interviewContact !== (job.interview_contact ?? "")) changes.push("interview contact");
  if (interviewPrep !== (job.interview_prep ?? "")) changes.push("interview prep");
  if (offerAmount !== (job.offer_amount?.toString() ?? "")) changes.push("offer amount");
  if (offerDate !== (job.offer_date?.slice(0, 10) ?? "")) changes.push("offer date");
  if (offerDeadline !== (job.offer_deadline?.slice(0, 10) ?? "")) changes.push("offer deadline");
  if (rejectionReason !== (job.rejection_reason ?? "")) changes.push("rejection reason");
  if (rejectedDate !== (job.rejected_date?.slice(0, 10) ?? "")) changes.push("rejected date");
  if (archiveReason !== (job.archive_reason ?? "")) changes.push("archive reason");
  if (archivedDate !== (job.archived_date?.slice(0, 10) ?? "")) changes.push("archived date");

  const hasChanges = changes.length > 0;

  // ── Tab definitions ──────────────────────────────────────────────────────
  const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "application", label: "Application", icon: Briefcase },
    { id: "timeline", label: "Timeline", icon: History },
    { id: "notes", label: "Notes", icon: StickyNote },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-[100dvh] w-full flex-col border border-[var(--sidebar-border)] bg-[var(--background)] shadow-xl sm:h-auto sm:max-h-[90vh] sm:max-w-2xl sm:rounded-2xl"
      >
        {/* ═══ Sticky Header ═══ */}
        {/* pt env(safe-area-inset-top) keeps the title clear of the iOS notch / status bar
            when the modal is full-height on mobile */}
        <div
          className="shrink-0 border-b border-[var(--sidebar-border)] p-4 sm:p-5"
          style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
        >
          {/* Title row + close */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {editing ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`${inputClass} text-lg font-bold`}
                  placeholder="Job title"
                />
              ) : (
                <h2 className="truncate text-lg font-bold sm:text-xl">
                  {titleCase(title || job.title)}
                </h2>
              )}
              <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
                {company || job.company} <span className="opacity-50">·</span>{" "}
                {location || job.location}
                {job.job_type && job.job_type !== "full-time" && (
                  <>
                    {" "}
                    <span className="opacity-50">·</span>{" "}
                    <span className="capitalize">
                      {job.job_type.replace("-", " ")}
                    </span>
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                  title="Edit job details"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Compact info row: score, salary, original posting link */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {job.relevance_score !== null && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  job.relevance_score >= 70
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                    : job.relevance_score >= 40
                      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                      : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
              >
                Score {job.relevance_score}
              </span>
            )}
            {job.salary_min && (
              <span className="whitespace-nowrap rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-semibold">
                ${(job.salary_min / 1000).toFixed(0)}k
                {job.salary_max
                  ? `–$${(job.salary_max / 1000).toFixed(0)}k`
                  : "+"}
              </span>
            )}
            {job.source && (
              <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                {job.source}
              </span>
            )}
            {job.work_mode && job.work_mode !== "onsite" && (
              <span className="rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[var(--muted)]">
                {job.work_mode}
              </span>
            )}
            {(jobUrl || job.url) && (
              <a
                href={jobUrl || job.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)] hover:underline"
              >
                View original posting <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>

          {/* Status buttons — always accessible regardless of which tab */}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {STATUS_ACTIONS.map((action) => {
              const isActive = job.status === action.value;
              return (
                <button
                  key={action.value}
                  onClick={() => handleStatusChange(action.value)}
                  disabled={saving || isActive}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors ${
                    isActive
                      ? "border-[var(--primary)] bg-[var(--primary)] text-white"
                      : "border-[var(--sidebar-border)] text-[var(--muted)] hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                  } disabled:opacity-50`}
                >
                  <action.icon className="h-3 w-3" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ═══ Tab bar ═══ */}
        <div className="shrink-0 border-b border-[var(--sidebar-border)] px-3 sm:px-5">
          <div className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
                  tab === t.id
                    ? "border-[var(--primary)] text-[var(--foreground)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}
              >
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ═══ Tab content (scrollable) ═══ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {tab === "overview" && (
            <OverviewTab
              editing={editing}
              company={company}
              setCompany={setCompany}
              location={location}
              setLocation={setLocation}
              jobUrl={jobUrl}
              setJobUrl={setJobUrl}
              description={description}
              setDescription={setDescription}
              deadline={deadline}
              setDeadline={setDeadline}
              job={job}
            />
          )}

          {tab === "application" && (
            <ApplicationTab
              job={job}
              appliedDate={appliedDate}
              setAppliedDate={setAppliedDate}
              appliedMethod={appliedMethod}
              setAppliedMethod={setAppliedMethod}
              appliedResumeVersion={appliedResumeVersion}
              setAppliedResumeVersion={setAppliedResumeVersion}
              appliedCoverLetter={appliedCoverLetter}
              setAppliedCoverLetter={setAppliedCoverLetter}
              appliedReferral={appliedReferral}
              setAppliedReferral={setAppliedReferral}
              appliedFollowUpDate={appliedFollowUpDate}
              setAppliedFollowUpDate={setAppliedFollowUpDate}
              interviewDate={interviewDate}
              setInterviewDate={setInterviewDate}
              interviewType={interviewType}
              setInterviewType={setInterviewType}
              interviewLocation={interviewLocation}
              setInterviewLocation={setInterviewLocation}
              interviewContact={interviewContact}
              setInterviewContact={setInterviewContact}
              interviewPrep={interviewPrep}
              setInterviewPrep={setInterviewPrep}
              offerAmount={offerAmount}
              setOfferAmount={setOfferAmount}
              offerSalaryPeriod={offerSalaryPeriod}
              setOfferSalaryPeriod={setOfferSalaryPeriod}
              offerDate={offerDate}
              setOfferDate={setOfferDate}
              offerDeadline={offerDeadline}
              setOfferDeadline={setOfferDeadline}
              rejectionReason={rejectionReason}
              setRejectionReason={setRejectionReason}
              rejectedDate={rejectedDate}
              setRejectedDate={setRejectedDate}
              archiveReason={archiveReason}
              setArchiveReason={setArchiveReason}
              archivedDate={archivedDate}
              setArchivedDate={setArchivedDate}
            />
          )}

          {tab === "timeline" && (
            <ApplicationTimeline
              job={job}
              onClearEvent={handleClearTimelineEvent}
            />
          )}

          {tab === "notes" && (
            <div>
              <p className="mb-2 text-xs text-[var(--muted)]">
                Anything useful for this application — referral contacts, prep links,
                follow-up reminders, etc.
              </p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Start typing..."
                rows={14}
                className={inputClass}
              />
            </div>
          )}
        </div>

        {/* ═══ Sticky footer ═══ */}
        {/* pb env(safe-area-inset-bottom) keeps buttons clear of the iOS home indicator */}
        <div
          className="shrink-0 border-t border-[var(--sidebar-border)] bg-[var(--background)] p-3 sm:p-4"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="flex items-center justify-between gap-3">
            {/* Left: Delete (with confirmation) */}
            {confirmDelete ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="hidden text-[var(--destructive)] sm:inline">
                  Delete permanently?
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
                className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-[var(--muted)] hover:text-[var(--destructive)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}

            {/* Right: Save Changes with unsaved count */}
            <button
              onClick={handleSaveDetails}
              disabled={saving || !hasChanges}
              title={
                hasChanges
                  ? `Unsaved: ${changes.slice(0, 5).join(", ")}${
                      changes.length > 5 ? "…" : ""
                    }`
                  : "No changes to save"
              }
              className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Changes
              {hasChanges && (
                <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[10px] font-bold">
                  {changes.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Sub-components — defined here to keep state ownership in the parent
// ═════════════════════════════════════════════════════════════════════════════

interface OverviewTabProps {
  editing: boolean;
  company: string;
  setCompany: (v: string) => void;
  location: string;
  setLocation: (v: string) => void;
  jobUrl: string;
  setJobUrl: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  deadline: string;
  setDeadline: (v: string) => void;
  job: Job;
}

function OverviewTab({
  editing,
  company,
  setCompany,
  location,
  setLocation,
  jobUrl,
  setJobUrl,
  description,
  setDescription,
  deadline,
  setDeadline,
  job,
}: OverviewTabProps) {
  if (editing) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Company</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={inputClass}
              placeholder="Company"
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className={inputClass}
              placeholder="Location"
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Posting URL</label>
          <input
            type="url"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
            className={inputClass}
            placeholder="https://..."
          />
        </div>
        <div>
          <label className={labelClass}>Application Deadline</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={8}
            className={inputClass}
            placeholder="Job description..."
          />
        </div>
      </div>
    );
  }

  // Read-only view
  return (
    <div className="space-y-4">
      {deadline && (
        <div className="rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-3">
          <p className="text-xs font-medium text-[var(--muted)]">Application Deadline</p>
          <p className="mt-0.5 text-sm font-semibold">
            {parseDate(deadline)?.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            }) ?? deadline}
          </p>
        </div>
      )}

      {(description || job.description) ? (
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Description
          </h3>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
            {description || job.description}
          </p>
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          No description yet. Click the pencil icon to add one.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

interface ApplicationTabProps {
  job: Job;
  appliedDate: string;
  setAppliedDate: (v: string) => void;
  appliedMethod: string;
  setAppliedMethod: (v: string) => void;
  appliedResumeVersion: string;
  setAppliedResumeVersion: (v: string) => void;
  appliedCoverLetter: boolean;
  setAppliedCoverLetter: (v: boolean) => void;
  appliedReferral: string;
  setAppliedReferral: (v: string) => void;
  appliedFollowUpDate: string;
  setAppliedFollowUpDate: (v: string) => void;
  interviewDate: string;
  setInterviewDate: (v: string) => void;
  interviewType: string;
  setInterviewType: (v: string) => void;
  interviewLocation: string;
  setInterviewLocation: (v: string) => void;
  interviewContact: string;
  setInterviewContact: (v: string) => void;
  interviewPrep: string;
  setInterviewPrep: (v: string) => void;
  offerAmount: string;
  setOfferAmount: (v: string) => void;
  offerSalaryPeriod: "annual" | "monthly" | "hourly";
  setOfferSalaryPeriod: (v: "annual" | "monthly" | "hourly") => void;
  offerDate: string;
  setOfferDate: (v: string) => void;
  offerDeadline: string;
  setOfferDeadline: (v: string) => void;
  rejectionReason: string;
  setRejectionReason: (v: string) => void;
  rejectedDate: string;
  setRejectedDate: (v: string) => void;
  archiveReason: string;
  setArchiveReason: (v: string) => void;
  archivedDate: string;
  setArchivedDate: (v: string) => void;
}

function ApplicationTab(props: ApplicationTabProps) {
  const { job } = props;

  // For statuses with no extra fields, show a helpful prompt
  if (job.status === "saved" || job.status === "new") {
    return (
      <div className="rounded-xl border border-dashed border-[var(--sidebar-border)] p-8 text-center">
        <Briefcase className="mx-auto h-10 w-10 text-[var(--muted)]" />
        <h3 className="mt-3 text-sm font-semibold">No application details yet</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">
          When you mark this job as Applied (using the status buttons above),
          this tab will let you track method, resume version, follow-ups, and more.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {job.status === "applied" && <AppliedFields {...props} />}
      {job.status === "interview" && <InterviewFields {...props} />}
      {job.status === "offer" && <OfferFields {...props} />}
      {job.status === "rejected" && <RejectedFields {...props} />}
      {job.status === "archived" && <ArchivedFields {...props} />}
    </div>
  );
}

function AppliedFields(p: ApplicationTabProps) {
  return (
    <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
      <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300">
        Application Details
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>How did you apply?</label>
          <select
            value={p.appliedMethod}
            onChange={(e) => p.setAppliedMethod(e.target.value)}
            className={inputClass}
          >
            <option value="">— Not specified —</option>
            <option value="company_website">Company Website</option>
            <option value="school_portal">School / University Career Portal</option>
            <option value="linkedin_easy_apply">LinkedIn Easy Apply</option>
            <option value="job_portal">Job Portal (Indeed, etc.)</option>
            <option value="referral">Referral</option>
            <option value="email">Email</option>
            <option value="in_person">In Person / Job Fair</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Resume Version</label>
          <input
            type="text"
            value={p.appliedResumeVersion}
            onChange={(e) => p.setAppliedResumeVersion(e.target.value)}
            placeholder="e.g. Resume_v3_Frontend.pdf"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Referral Contact</label>
          <input
            type="text"
            value={p.appliedReferral}
            onChange={(e) => p.setAppliedReferral(e.target.value)}
            placeholder="Name, email, or relationship"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Follow-up Date</label>
          <input
            type="date"
            value={p.appliedFollowUpDate}
            onChange={(e) => p.setAppliedFollowUpDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={p.appliedCoverLetter}
          onChange={(e) => p.setAppliedCoverLetter(e.target.checked)}
          className="h-4 w-4 rounded border-[var(--sidebar-border)] accent-[var(--primary)]"
        />
        Submitted a cover letter
      </label>
      <div>
        <label className={labelClass}>Date Applied</label>
        <input
          type="date"
          value={p.appliedDate}
          onChange={(e) => p.setAppliedDate(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function InterviewFields(p: ApplicationTabProps) {
  return (
    <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
      <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">
        Interview Details
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Date &amp; Time</label>
          <input
            type="datetime-local"
            value={p.interviewDate}
            onChange={(e) => p.setInterviewDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Interview Type</label>
          <select
            value={p.interviewType}
            onChange={(e) => p.setInterviewType(e.target.value)}
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
            value={p.interviewLocation}
            onChange={(e) => p.setInterviewLocation(e.target.value)}
            placeholder="Office address or Zoom/Teams link"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Contact Person</label>
          <input
            type="text"
            value={p.interviewContact}
            onChange={(e) => p.setInterviewContact(e.target.value)}
            placeholder="Interviewer name, email, or phone"
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Prep Notes &amp; Links</label>
        <textarea
          value={p.interviewPrep}
          onChange={(e) => p.setInterviewPrep(e.target.value)}
          placeholder="Company research, questions to ask, portfolio links, practice problems..."
          rows={4}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function OfferFields(p: ApplicationTabProps) {
  return (
    <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
      <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">
        Offer Details
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>Pay Period</label>
          <select
            value={p.offerSalaryPeriod}
            onChange={(e) =>
              p.setOfferSalaryPeriod(e.target.value as "annual" | "monthly" | "hourly")
            }
            className={inputClass}
          >
            <option value="annual">Annual</option>
            <option value="monthly">Monthly</option>
            <option value="hourly">Hourly</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>
            Offered Amount (
            {p.offerSalaryPeriod === "hourly"
              ? "$/hr"
              : p.offerSalaryPeriod === "monthly"
                ? "$/mo"
                : "$/yr"}
            )
          </label>
          <input
            type="number"
            value={p.offerAmount}
            onChange={(e) => p.setOfferAmount(e.target.value)}
            placeholder={
              p.offerSalaryPeriod === "hourly"
                ? "e.g. 40"
                : p.offerSalaryPeriod === "monthly"
                  ? "e.g. 6000"
                  : "e.g. 75000"
            }
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Response Deadline</label>
          <input
            type="date"
            value={p.offerDeadline}
            onChange={(e) => p.setOfferDeadline(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className={labelClass}>Date Received</label>
        <input
          type="date"
          value={p.offerDate}
          onChange={(e) => p.setOfferDate(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function RejectedFields(p: ApplicationTabProps) {
  return (
    <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
      <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">
        Rejection Details
      </h3>
      <div>
        <label className={labelClass}>Reason</label>
        <select
          value={p.rejectionReason}
          onChange={(e) => p.setRejectionReason(e.target.value)}
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
          value={p.rejectedDate}
          onChange={(e) => p.setRejectedDate(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}

function ArchivedFields(p: ApplicationTabProps) {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/30">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        Archive Details
      </h3>
      <div>
        <label className={labelClass}>Reason for archiving</label>
        <select
          value={p.archiveReason}
          onChange={(e) => p.setArchiveReason(e.target.value)}
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
          value={p.archivedDate}
          onChange={(e) => p.setArchivedDate(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}

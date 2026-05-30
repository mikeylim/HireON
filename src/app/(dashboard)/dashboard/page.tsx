"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Briefcase,
  Bookmark,
  CheckCircle2,
  Clock,
  ArrowRight,
  CalendarClock,
  AlertTriangle,
  Trophy,
  TrendingUp,
  Sparkles,
  CalendarRange,
  Check,
  AlarmClockPlus,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import { titleCase, parseDate, todayLocal } from "@/lib/utils";
import { JobDetailModal } from "@/components/jobs/job-detail-modal";
import type { Job } from "@/lib/types/job";

interface StatCard {
  label: string;
  value: number;
  icon: typeof Briefcase;
  color: string;
  href: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [deadlineJobs, setDeadlineJobs] = useState<Job[]>([]);
  const [followUpJobs, setFollowUpJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [appliedThisWeek, setAppliedThisWeek] = useState(0);
  const [appliedThisMonth, setAppliedThisMonth] = useState(0);
  const [interviewRate, setInterviewRate] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    // Deadlines are calendar dates stored at UTC midnight (e.g. "2026-05-22T00:00:00+00:00").
    // To match today's deadline, compare against the LOCAL calendar date string —
    // Postgres treats "2026-05-22" as UTC midnight on that day, exactly matching the stored value.
    const todayStart = todayLocal();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
    const sevenDaysFromNow = `${sevenDaysLater.getFullYear()}-${String(sevenDaysLater.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysLater.getDate()).padStart(2, "0")}`;

    const [
      total,
      saved,
      applied,
      interviews,
      offers,
      today,
      deadlinesRes,
      followUpRes,
      appliedWeekRes,
      appliedMonthRes,
      totalAppliedRes,
      totalInterviewsRes,
    ] = await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "saved"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "applied"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "interview"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "offer"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).gte("scraped_at", oneDayAgo),
      // Deadline alerts: jobs you still need to apply to, with deadlines in the
      // next 7 days. Only "saved" (and "new") qualify — once applied, the
      // deadline is no longer an action item, so we exclude those.
      supabase
        .from("jobs")
        .select("*")
        .in("status", ["saved", "new"])
        .gte("deadline", todayStart)
        .lte("deadline", sevenDaysFromNow)
        .order("deadline", { ascending: true })
        .limit(5),
      // Follow-up reminders: applied jobs with follow-up date today or overdue
      supabase
        .from("jobs")
        .select("*")
        .eq("status", "applied")
        .not("applied_follow_up_date", "is", null)
        .lte("applied_follow_up_date", sevenDaysFromNow)
        .order("applied_follow_up_date", { ascending: true })
        .limit(5),
      // Applied this week
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .eq("status", "applied")
        .gte("applied_date", oneWeekAgo),
      // Applied this month
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["applied", "interview", "offer", "rejected"])
        .gte("applied_date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
      // Total applied ever (for interview rate calc)
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["applied", "interview", "offer", "rejected"]),
      // Total interviews + offers (for rate calc)
      supabase
        .from("jobs")
        .select("*", { count: "exact", head: true })
        .in("status", ["interview", "offer"]),
    ]);

    setStats([
      { label: "Total Jobs", value: total.count ?? 0, icon: Briefcase, color: "text-[var(--primary)]", href: "/dashboard/jobs" },
      { label: "New Today", value: today.count ?? 0, icon: Clock, color: "text-cyan-500", href: "/dashboard/jobs" },
      { label: "Saved", value: saved.count ?? 0, icon: Bookmark, color: "text-[var(--warning)]", href: "/dashboard/saved" },
      { label: "Applied", value: applied.count ?? 0, icon: CheckCircle2, color: "text-[var(--success)]", href: "/dashboard/applied" },
      { label: "Interviews", value: interviews.count ?? 0, icon: CalendarClock, color: "text-purple-500", href: "/dashboard/interviews" },
      { label: "Offers", value: offers.count ?? 0, icon: Trophy, color: "text-amber-500", href: "/dashboard/offers" },
    ]);

    setDeadlineJobs((deadlinesRes.data as Job[]) ?? []);
    setFollowUpJobs((followUpRes.data as Job[]) ?? []);
    setAppliedThisWeek(appliedWeekRes.count ?? 0);
    setAppliedThisMonth(appliedMonthRes.count ?? 0);

    // Interview rate = (interviews + offers) / total applied
    const totalApplied = totalAppliedRes.count ?? 0;
    const totalInterviews = totalInterviewsRes.count ?? 0;
    if (totalApplied > 0) {
      setInterviewRate(Math.round((totalInterviews / totalApplied) * 100));
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Mark a follow-up reminder as done — clears the reminder date so it
  // drops off the dashboard. The job and its other data are untouched.
  async function markFollowUpDone(jobId: string) {
    // Optimistically remove from the list for instant feedback
    setFollowUpJobs((prev) => prev.filter((j) => j.id !== jobId));
    await fetch("/api/jobs/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId, updates: { applied_follow_up_date: null } }),
    });
  }

  // Snooze a follow-up reminder by pushing it 7 days into the future.
  async function snoozeFollowUp(jobId: string, currentDate: string) {
    const base = parseDate(currentDate) ?? new Date();
    base.setDate(base.getDate() + 7);
    const next = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-${String(base.getDate()).padStart(2, "0")}`;
    // Remove from the visible list — if the new date is still within the
    // 7-day window it'll reappear on next load, otherwise it's gone for now
    setFollowUpJobs((prev) => prev.filter((j) => j.id !== jobId));
    await fetch("/api/jobs/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: jobId, updates: { applied_follow_up_date: next } }),
    });
  }

  return (
    <div className="min-w-0 space-y-8 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--muted)]">
          Your Ontario job search at a glance.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex items-center gap-4 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5 transition-colors hover:border-[var(--primary)]"
          >
            <stat.icon className={`h-8 w-8 ${stat.color}`} />
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-[var(--muted)]">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Application stats bar */}
      <div className="flex flex-wrap gap-6 rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-[var(--primary)]" />
          <div>
            <p className="text-lg font-bold">{appliedThisWeek}</p>
            <p className="text-xs text-[var(--muted)]">Applied this week</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CalendarRange className="h-5 w-5 text-cyan-500" />
          <div>
            <p className="text-lg font-bold">{appliedThisMonth}</p>
            <p className="text-xs text-[var(--muted)]">Applied this month</p>
          </div>
        </div>
        {interviewRate !== null && (
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-lg font-bold">{interviewRate}%</p>
              <p className="text-xs text-[var(--muted)]">Interview rate</p>
            </div>
          </div>
        )}
      </div>

      {/* Deadline alerts */}
      {deadlineJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--warning)]">
              Upcoming Deadlines
            </h2>
          </div>
          {deadlineJobs.map((job) => {
            // Use parseDate so date-only deadlines (e.g. "2026-05-23") aren't
            // shifted to the previous day by timezone conversion
            const deadlineDate = parseDate(job.deadline);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysLeft = deadlineDate
              ? Math.round((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              : 0;
            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--warning)]/30 bg-yellow-50 p-4 transition-colors hover:border-[var(--warning)] dark:bg-yellow-950/20"
              >
                <div>
                  <h3 className="font-semibold">{titleCase(job.title)}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {job.company} · {job.status}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    daysLeft <= 2
                      ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  }`}
                >
                  {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `${daysLeft} days left`}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Follow-up reminders */}
      {followUpJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Follow-up Reminders
            </h2>
          </div>
          {followUpJobs.map((job) => {
            // parseDate avoids the timezone shift on date-only values
            const followUpDate = parseDate(job.applied_follow_up_date) ?? new Date();
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysUntil = Math.round(
              (followUpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            const isOverdue = daysUntil < 0;
            const isToday = daysUntil === 0;

            return (
              <div
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-[var(--primary)] ${
                  isOverdue
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                    : isToday
                      ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                      : "border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{titleCase(job.title)}</h3>
                  <p className="truncate text-sm text-[var(--muted)]">
                    {job.company}
                    {job.applied_date && (
                      <span> · Applied {parseDate(job.applied_date)?.toLocaleDateString()}</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold ${
                      isOverdue
                        ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                        : isToday
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {isOverdue
                      ? `${Math.abs(daysUntil)} day${Math.abs(daysUntil) !== 1 ? "s" : ""} overdue`
                      : isToday
                        ? "Follow up today"
                        : `In ${daysUntil} day${daysUntil !== 1 ? "s" : ""}`}
                  </span>

                  {/* Snooze +1 week — push the reminder forward */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      snoozeFollowUp(job.id, job.applied_follow_up_date!);
                    }}
                    title="Snooze 1 week"
                    className="rounded-lg border border-[var(--sidebar-border)] p-1.5 text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)]"
                  >
                    <AlarmClockPlus className="h-4 w-4" />
                  </button>

                  {/* Done — clear the reminder */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      markFollowUpDone(job.id);
                    }}
                    title="Mark as followed up"
                    className="rounded-lg border border-[var(--sidebar-border)] p-1.5 text-[var(--muted)] transition-colors hover:border-[var(--success)] hover:text-[var(--success)]"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick action cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link
          href="/dashboard/jobs"
          className="flex items-center justify-between rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-6 transition-colors hover:border-[var(--primary)]"
        >
          <div>
            <h3 className="font-semibold">Search &amp; Scrape Jobs</h3>
            <p className="text-sm text-[var(--muted)]">
              Find new postings from Job Bank, Adzuna, Jooble, and Remotive.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--muted)]" />
        </Link>

        <Link
          href="/dashboard/add"
          className="flex items-center justify-between rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-6 transition-colors hover:border-[var(--primary)]"
        >
          <div>
            <h3 className="font-semibold">Add Job Manually</h3>
            <p className="text-sm text-[var(--muted)]">
              Track a job from Indeed, Glassdoor, or any other source.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--muted)]" />
        </Link>
      </div>

      {/* Job detail modal — opens when a deadline or follow-up card is clicked */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onUpdate={(updated) => {
            setSelectedJob(updated);
            loadData();
          }}
          onDelete={() => {
            setSelectedJob(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

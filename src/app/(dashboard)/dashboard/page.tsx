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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { titleCase } from "@/lib/utils";
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
  const [appliedThisWeek, setAppliedThisWeek] = useState(0);
  const [interviewRate, setInterviewRate] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    // Use start of today for deadline comparison — date-only values like "2026-04-03"
    // are stored as midnight UTC, so comparing against current time would miss today's deadlines
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

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
      totalAppliedRes,
      totalInterviewsRes,
    ] = await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "saved"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "applied"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "interview"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "offer"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).gte("scraped_at", oneDayAgo),
      // Deadline alerts: jobs with deadlines in the next 7 days
      supabase
        .from("jobs")
        .select("*")
        .in("status", ["saved", "applied"])
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
            const daysLeft = Math.ceil(
              (new Date(job.deadline!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            return (
              <Link
                key={job.id}
                href={`/dashboard/${job.status === "applied" ? "applied" : "saved"}`}
                className="flex items-center justify-between rounded-xl border border-[var(--warning)]/30 bg-yellow-50 p-4 transition-colors hover:border-[var(--warning)] dark:bg-yellow-950/20"
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
              </Link>
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
            const followUpDate = new Date(job.applied_follow_up_date!);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const daysUntil = Math.ceil(
              (followUpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            const isOverdue = daysUntil < 0;
            const isToday = daysUntil === 0;

            return (
              <Link
                key={job.id}
                href="/dashboard/applied"
                className={`flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-[var(--primary)] ${
                  isOverdue
                    ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
                    : isToday
                      ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20"
                      : "border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]"
                }`}
              >
                <div>
                  <h3 className="font-semibold">{titleCase(job.title)}</h3>
                  <p className="text-sm text-[var(--muted)]">
                    {job.company}
                    {job.applied_date && (
                      <span> · Applied {new Date(job.applied_date).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
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
              </Link>
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
    </div>
  );
}

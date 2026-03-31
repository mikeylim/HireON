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
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface StatCard {
  label: string;
  value: number;
  icon: typeof Briefcase;
  color: string;
  href: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<StatCard[]>([]);

  const loadStats = useCallback(async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [total, saved, applied, interviews, today] = await Promise.all([
      supabase.from("jobs").select("*", { count: "exact", head: true }),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "saved"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "applied"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "interview"),
      supabase.from("jobs").select("*", { count: "exact", head: true }).gte("scraped_at", oneDayAgo),
    ]);

    setStats([
      { label: "Total Jobs", value: total.count ?? 0, icon: Briefcase, color: "text-[var(--primary)]", href: "/dashboard/jobs" },
      { label: "New Today", value: today.count ?? 0, icon: Clock, color: "text-cyan-500", href: "/dashboard/jobs" },
      { label: "Saved", value: saved.count ?? 0, icon: Bookmark, color: "text-[var(--warning)]", href: "/dashboard/saved" },
      { label: "Applied", value: applied.count ?? 0, icon: CheckCircle2, color: "text-[var(--success)]", href: "/dashboard/applied" },
      { label: "Interviews", value: interviews.count ?? 0, icon: CalendarClock, color: "text-purple-500", href: "/dashboard/interviews" },
    ]);
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--muted)]">
          Your Ontario job search at a glance.
        </p>
      </div>

      {/* Stat cards — clickable, navigate to the relevant page */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
          href="/dashboard/saved"
          className="flex items-center justify-between rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-6 transition-colors hover:border-[var(--primary)]"
        >
          <div>
            <h3 className="font-semibold">Saved Jobs</h3>
            <p className="text-sm text-[var(--muted)]">
              Review bookmarked jobs and decide what to apply for.
            </p>
          </div>
          <ArrowRight className="h-5 w-5 text-[var(--muted)]" />
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  Activity,
} from "lucide-react";
import { createBrowserSupabase } from "@/lib/supabase/browser";
import type { Job, JobStatus } from "@/lib/types/job";

// Brand colors matching the rest of the app's status system
const STATUS_COLORS: Record<JobStatus, string> = {
  new: "#64748b",
  saved: "#f59e0b",
  applied: "#2563eb",
  interview: "#a855f7",
  offer: "#22c55e",
  rejected: "#ef4444",
  archived: "#9ca3af",
};

const SOURCE_COLORS: Record<string, string> = {
  jobbank: "#ef4444",
  adzuna: "#2563eb",
  jooble: "#f59e0b",
  remotive: "#22c55e",
  indeed: "#6366f1",
  glassdoor: "#10b981",
};

export default function AnalyticsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const supabase = createBrowserSupabase();
    const { data } = await supabase.from("jobs").select("*");
    setJobs((data as Job[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Compute chart data ──

  // Applications per week — last 8 weeks
  // Groups applied_date by ISO week, counts jobs in each bucket
  const weeklyApplications = (() => {
    const weeks: { week: string; count: number }[] = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - i * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);

      const count = jobs.filter((j) => {
        if (!j.applied_date) return false;
        const d = new Date(j.applied_date);
        return d >= weekStart && d < weekEnd;
      }).length;

      weeks.push({
        week: weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        count,
      });
    }
    return weeks;
  })();

  // Status distribution — count of jobs per status
  const statusDistribution = (() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      counts[j.status] = (counts[j.status] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value, fill: STATUS_COLORS[name as JobStatus] ?? "#999" }))
      .sort((a, b) => b.value - a.value);
  })();

  // Sources breakdown — where your jobs come from
  const sourceBreakdown = (() => {
    const counts: Record<string, number> = {};
    jobs.forEach((j) => {
      const src = j.source || "unknown";
      counts[src] = (counts[src] ?? 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, fill: SOURCE_COLORS[name] ?? "#6366f1" }))
      .sort((a, b) => b.count - a.count);
  })();

  // Conversion funnel — applied → interview → offer
  const funnel = (() => {
    const applied = jobs.filter((j) =>
      ["applied", "interview", "offer", "rejected"].includes(j.status) ||
      j.applied_date !== null
    ).length;
    const interviewed = jobs.filter((j) =>
      ["interview", "offer"].includes(j.status) || j.interview_date !== null
    ).length;
    const offered = jobs.filter((j) =>
      j.status === "offer" || j.offer_date !== null
    ).length;

    return [
      { stage: "Applied", count: applied, fill: STATUS_COLORS.applied },
      { stage: "Interview", count: interviewed, fill: STATUS_COLORS.interview },
      { stage: "Offer", count: offered, fill: STATUS_COLORS.offer },
    ];
  })();

  // Convert ratios for display
  const interviewRate = funnel[0].count > 0
    ? Math.round((funnel[1].count / funnel[0].count) * 100)
    : 0;
  const offerRate = funnel[1].count > 0
    ? Math.round((funnel[2].count / funnel[1].count) * 100)
    : 0;

  if (loading) {
    return (
      <div className="min-w-0 space-y-6 overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-[var(--muted)]">Loading your job search data...</p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="min-w-0 space-y-6 overflow-hidden">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-[var(--muted)]">
            Insights about your job search activity.
          </p>
        </div>
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-8 text-center">
          <BarChart3 className="mx-auto h-12 w-12 text-[var(--muted)]" />
          <h3 className="mt-4 text-lg font-semibold">No data yet</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Start scraping and saving jobs. Charts will appear here as you build your pipeline.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-6 overflow-hidden">
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-[var(--muted)]">
          Insights about your job search activity.
        </p>
      </div>

      {/* Top summary numbers */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Total Applications</p>
          <p className="mt-1 text-3xl font-bold">{funnel[0].count}</p>
        </div>
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Applied → Interview</p>
          <p className="mt-1 text-3xl font-bold text-purple-500">{interviewRate}%</p>
        </div>
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Interview → Offer</p>
          <p className="mt-1 text-3xl font-bold text-[var(--success)]">{offerRate}%</p>
        </div>
      </div>

      {/* Applications per week — bar chart */}
      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Applications — Last 8 Weeks
          </h2>
        </div>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyApplications}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sidebar-border)" />
              <XAxis
                dataKey="week"
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                stroke="var(--sidebar-border)"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                stroke="var(--sidebar-border)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--sidebar-border)",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status distribution + Sources breakdown side by side on desktop */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status donut */}
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Status Distribution
            </h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                >
                  {statusDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--background)",
                    border: "1px solid var(--sidebar-border)",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Legend
                  wrapperStyle={{ fontSize: "12px", color: "var(--muted)" }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sources breakdown — horizontal bars */}
        <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--primary)]" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
              Jobs by Source
            </h2>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sourceBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--sidebar-border)" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  stroke="var(--sidebar-border)"
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fill: "var(--muted)", fontSize: 12 }}
                  stroke="var(--sidebar-border)"
                  width={80}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--background)",
                    border: "1px solid var(--sidebar-border)",
                    borderRadius: "0.5rem",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {sourceBreakdown.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Conversion funnel */}
      <div className="rounded-xl border border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] p-5">
        <div className="mb-4 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-[var(--primary)]" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Conversion Funnel
          </h2>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--sidebar-border)" />
              <XAxis
                dataKey="stage"
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                stroke="var(--sidebar-border)"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "var(--muted)", fontSize: 12 }}
                stroke="var(--sidebar-border)"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--background)",
                  border: "1px solid var(--sidebar-border)",
                  borderRadius: "0.5rem",
                }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {funnel.map((entry) => (
                  <Cell key={entry.stage} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

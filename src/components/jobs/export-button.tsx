"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import type { JobStatus } from "@/lib/types/job";

interface ExportButtonProps {
  statuses: JobStatus[];
  filename?: string;
}

// Exports all jobs matching the given statuses as a CSV download
export function ExportButton({ statuses, filename = "hireon-jobs" }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);

    try {
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .in("status", statuses)
        .order("relevance_score", { ascending: false, nullsFirst: false });

      if (!data || data.length === 0) {
        setExporting(false);
        return;
      }

      // CSV columns — the most useful fields for a spreadsheet
      const headers = [
        "Title",
        "Company",
        "Location",
        "Status",
        "Source",
        "Job Type",
        "Work Mode",
        "Salary Min",
        "Salary Max",
        "Relevance Score",
        "URL",
        "Posted",
        "Deadline",
        "Applied Date",
        "Notes",
      ];

      const rows = data.map((job) => [
        escape(job.title),
        escape(job.company),
        escape(job.location),
        job.status,
        job.source,
        job.job_type,
        job.work_mode,
        job.salary_min ?? "",
        job.salary_max ?? "",
        job.relevance_score ?? "",
        job.url,
        job.posted_at ? new Date(job.posted_at).toLocaleDateString() : "",
        job.deadline ? new Date(job.deadline).toLocaleDateString() : "",
        job.applied_date ? new Date(job.applied_date).toLocaleDateString() : "",
        escape(job.notes ?? ""),
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      // Trigger browser download
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex items-center gap-1.5 rounded-lg border border-[var(--sidebar-border)] px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--foreground)] disabled:opacity-50"
    >
      {exporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Export CSV
    </button>
  );
}

// Escape commas and quotes for CSV
function escape(value: string): string {
  if (!value) return "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

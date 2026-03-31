import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// POST /api/jobs/save
// Takes an array of jobs the user has chosen to keep and inserts them into Supabase.
// Deduplicates by URL — if a job already exists, it's silently skipped.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const jobs: Array<{
      title: string;
      company: string;
      location: string;
      url: string;
      source: string;
      salary_min: number | null;
      salary_max: number | null;
      description: string;
      posted_at: string | null;
      job_type: string;
      work_mode: string;
      tags: string[];
      relevance_score: number | null;
    }> = body.jobs ?? [];

    if (jobs.length === 0) {
      return NextResponse.json({
        data: null,
        error: null,
        message: "No jobs to save.",
      });
    }

    const rows = jobs.map((job) => ({
      title: job.title,
      company: job.company,
      location: job.location,
      url: job.url,
      source: job.source,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      description: job.description,
      posted_at: job.posted_at,
      job_type: job.job_type,
      work_mode: job.work_mode,
      tags: job.tags,
      relevance_score: job.relevance_score,
      status: "saved",
    }));

    const { data, error } = await supabase
      .from("jobs")
      .upsert(rows, { onConflict: "url", ignoreDuplicates: true })
      .select();

    if (error) {
      console.error("Supabase save error:", error);
      return NextResponse.json(
        { data: null, error: error.message, message: "Database error." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      error: null,
      message: `Saved ${data?.length ?? 0} job${(data?.length ?? 0) !== 1 ? "s" : ""} to your collection.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Save error:", message);
    return NextResponse.json(
      { data: null, error: message, message: "Save failed." },
      { status: 500 }
    );
  }
}

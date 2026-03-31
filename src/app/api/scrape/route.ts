import { NextRequest, NextResponse } from "next/server";
import { fetchJobBankFeed } from "@/lib/scraper/jobbank";
import { fetchAdzunaJobs } from "@/lib/scraper/adzuna";
import { fetchJoobleJobs } from "@/lib/scraper/jooble";
import { fetchRemotiveJobs } from "@/lib/scraper/remotive";
import type { Job } from "@/lib/types/job";

const SOURCES = ["jobbank", "adzuna", "jooble", "remotive"] as const;
type Source = (typeof SOURCES)[number];

// POST /api/scrape
// Returns scraped results as a preview — nothing is saved to Supabase.
// The user decides which jobs to keep via /api/jobs/save.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const keywords: string[] = body.keywords ?? ["developer"];
    const location: string = body.location ?? "Toronto, ON";
    const sources: Source[] = body.sources ?? [...SOURCES];

    const scrapePromises: Promise<Partial<Job>[]>[] = [];

    for (const keyword of keywords) {
      if (sources.includes("jobbank")) {
        scrapePromises.push(
          fetchJobBankFeed({ keyword, location }).catch((err) => {
            console.error(`[jobbank] "${keyword}" failed:`, err.message);
            return [];
          })
        );
      }

      if (sources.includes("adzuna")) {
        scrapePromises.push(
          fetchAdzunaJobs({ keyword, location: location.split(",")[0] }).catch((err) => {
            console.error(`[adzuna] "${keyword}" failed:`, err.message);
            return [];
          })
        );
      }

      if (sources.includes("jooble")) {
        scrapePromises.push(
          fetchJoobleJobs({ keyword, location: location.split(",")[0] }).catch((err) => {
            console.error(`[jooble] "${keyword}" failed:`, err.message);
            return [];
          })
        );
      }

      if (sources.includes("remotive")) {
        scrapePromises.push(
          fetchRemotiveJobs({ keyword, limit: 20 }).catch((err) => {
            console.error(`[remotive] "${keyword}" failed:`, err.message);
            return [];
          })
        );
      }
    }

    const allResults = await Promise.all(scrapePromises);
    const jobs = allResults.flat();

    // Normalize and deduplicate by URL before returning
    const seen = new Set<string>();
    const preview = jobs
      .map((job) => ({
        title: job.title ?? "Untitled",
        company: job.company ?? "Unknown",
        location: job.location ?? location,
        url: job.url ?? "",
        source: job.source ?? "unknown",
        salary_min: job.salary_min ?? null,
        salary_max: job.salary_max ?? null,
        description: job.description ?? "",
        posted_at: job.posted_at ?? null,
        job_type: job.job_type ?? "full-time",
        work_mode: job.work_mode ?? "onsite",
        tags: job.tags ?? [],
        relevance_score: null as number | null,
      }))
      .filter((r) => {
        if (!r.url || seen.has(r.url)) return false;
        seen.add(r.url);
        return true;
      });

    return NextResponse.json({
      data: preview,
      error: null,
      message: `Found ${preview.length} jobs from ${sources.join(", ")}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Scrape error:", message);
    return NextResponse.json(
      { data: null, error: message, message: "Scrape failed." },
      { status: 500 }
    );
  }
}

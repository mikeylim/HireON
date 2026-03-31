import axios from "axios";
import type { Job } from "@/lib/types/job";

// Jooble API — free tier, POST-based, aggregates from many job boards
// Docs: https://jooble.org/api/about

interface JoobleParams {
  keyword: string;
  location?: string; // e.g. "Toronto"
  page?: number;     // starts at 1
}

interface JoobleJob {
  title: string;
  company: string;
  location: string;
  snippet: string;     // short description / preview
  salary: string;      // human-readable like "$70k - $130k"
  link: string;
  source: string;
  type: string;        // e.g. "Full-time", "Part-time"
  updated: string;     // date string
}

export async function fetchJoobleJobs(
  params: JoobleParams
): Promise<Partial<Job>[]> {
  const apiKey = process.env.JOOBLE_API_KEY;

  if (!apiKey) {
    console.error("Jooble API key missing — check JOOBLE_API_KEY in .env.local");
    return [];
  }

  // Jooble uses a POST request with the API key baked into the URL
  const url = `https://jooble.org/api/${apiKey}`;

  const { data } = await axios.post(
    url,
    {
      keywords: params.keyword,
      location: params.location ?? "Toronto",
      page: params.page ?? 1,
    },
    { timeout: 15000 }
  );

  const jobs: JoobleJob[] = data.jobs ?? [];

  return jobs.map((job) => ({
    title: job.title ?? "Untitled",
    company: job.company || "Unknown",
    location: job.location || "Ontario",
    description: cleanHtml(job.snippet ?? ""),
    url: job.link ?? "",
    source: "jooble",
    salary_min: parseSalaryRange(job.salary).min,
    salary_max: parseSalaryRange(job.salary).max,
    posted_at: job.updated ?? null,
    job_type: mapJobType(job.type),
    status: "new" as const,
  }));
}

// Jooble gives salary as a string like "$70k - $130k" or "$165k"
// Try to extract numeric values from it
// Strip HTML from Jooble snippets
function cleanHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 300);
}

function parseSalaryRange(salary: string): {
  min: number | null;
  max: number | null;
} {
  if (!salary) return { min: null, max: null };

  // Match patterns like "$70k", "$70,000", "$191k - $275k"
  const matches = salary.match(/\$?([\d,]+(?:\.\d+)?)\s*k?/gi);
  if (!matches || matches.length === 0) return { min: null, max: null };

  const values = matches.map((m) => {
    const num = parseFloat(m.replace(/[$,]/g, ""));
    // If the value looks like shorthand (e.g. "70k" parsed as 70), multiply by 1000
    return m.toLowerCase().includes("k") ? num * 1000 : num < 1000 ? num * 1000 : num;
  });

  return {
    min: values[0] ?? null,
    max: values[1] ?? values[0] ?? null,
  };
}

// Map Jooble's type strings to our enum
function mapJobType(type: string): Job["job_type"] {
  const lower = (type ?? "").toLowerCase();
  if (lower.includes("part")) return "part-time";
  if (lower.includes("contract")) return "contract";
  if (lower.includes("intern")) return "internship";
  if (lower.includes("temp")) return "temporary";
  return "full-time";
}

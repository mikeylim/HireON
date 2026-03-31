import axios from "axios";
import type { Job } from "@/lib/types/job";

// Remotive API — completely free, no API key needed
// Only serves remote jobs, so every result gets work_mode: "remote"
// Rate limit: max 2 requests per minute
// Docs: https://github.com/remotive-com/remote-jobs-api

const BASE_URL = "https://remotive.com/api/remote-jobs";

interface RemotiveParams {
  keyword?: string;
  category?: string; // e.g. "software-dev", "design", "data"
  limit?: number;    // max results to return
}

interface RemotiveJob {
  id: number;
  title: string;
  company_name: string;
  candidate_required_location: string;
  description: string;
  url: string;
  salary: string;
  publication_date: string;
  job_type: string; // "full_time", "contract", etc.
  tags: string[];
  category: string;
}

export async function fetchRemotiveJobs(
  params: RemotiveParams
): Promise<Partial<Job>[]> {
  const queryParams = new URLSearchParams();

  if (params.keyword) queryParams.set("search", params.keyword);
  if (params.category) queryParams.set("category", params.category);
  if (params.limit) queryParams.set("limit", String(params.limit));

  const { data } = await axios.get(`${BASE_URL}?${queryParams}`, {
    timeout: 15000,
  });

  const jobs: RemotiveJob[] = data.jobs ?? [];

  return jobs.map((job) => ({
    title: job.title ?? "Untitled",
    company: job.company_name ?? "Unknown",
    // Remotive locations are like "Worldwide" or "Americas, Europe" — not city-level
    location: job.candidate_required_location || "Remote",
    description: cleanHtml(job.description ?? ""),
    url: job.url ?? "",
    source: "remotive",
    work_mode: "remote" as const,
    salary_min: parseRemotiveSalary(job.salary).min,
    salary_max: parseRemotiveSalary(job.salary).max,
    posted_at: job.publication_date ?? null,
    job_type: mapRemotiveType(job.job_type),
    tags: job.tags ?? [],
    status: "new" as const,
  }));
}

// Remotive descriptions come as full HTML — strip tags, entities, and cap length
function cleanHtml(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 300);
}

// Remotive salary field is inconsistent — sometimes empty, sometimes "$50k-$80k"
function parseRemotiveSalary(salary: string): {
  min: number | null;
  max: number | null;
} {
  if (!salary) return { min: null, max: null };

  const matches = salary.match(/\$?([\d,]+(?:\.\d+)?)\s*k?/gi);
  if (!matches || matches.length === 0) return { min: null, max: null };

  const values = matches.map((m) => {
    const num = parseFloat(m.replace(/[$,]/g, ""));
    return m.toLowerCase().includes("k") ? num * 1000 : num < 1000 ? num * 1000 : num;
  });

  return {
    min: values[0] ?? null,
    max: values[1] ?? values[0] ?? null,
  };
}

// Remotive uses "full_time", "contract", "part_time", "freelance", "internship", "other"
function mapRemotiveType(type: string): Job["job_type"] {
  switch (type) {
    case "full_time":
      return "full-time";
    case "part_time":
      return "part-time";
    case "contract":
    case "freelance":
      return "contract";
    case "internship":
      return "internship";
    default:
      return "full-time";
  }
}

import axios from "axios";
import type { Job } from "@/lib/types/job";

// Adzuna Canada API — free tier, returns up to 50 results per page
// Docs: https://developer.adzuna.com/docs/search
const BASE_URL = "https://api.adzuna.com/v1/api/jobs/ca/search";

interface AdzunaParams {
  keyword: string;
  location?: string; // e.g. "Toronto"
  page?: number;     // starts at 1
  resultsPerPage?: number; // max 50
}

interface AdzunaJob {
  title: string;
  company: { display_name: string };
  location: { display_name: string };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  created: string; // ISO date string
  contract_time?: string; // "full_time", "part_time"
  contract_type?: string; // "permanent", "contract"
  category?: { label: string; tag: string };
}

export async function fetchAdzunaJobs(
  params: AdzunaParams
): Promise<Partial<Job>[]> {
  const appId = process.env.ADZUNA_APP_ID;
  const apiKey = process.env.ADZUNA_API_KEY;

  if (!appId || !apiKey) {
    console.error("Adzuna credentials missing — check ADZUNA_APP_ID and ADZUNA_API_KEY in .env.local");
    return [];
  }

  const page = params.page ?? 1;
  const perPage = params.resultsPerPage ?? 20;

  const queryParams = new URLSearchParams({
    app_id: appId,
    app_key: apiKey,
    results_per_page: String(perPage),
    what: params.keyword,
    where: params.location ?? "Toronto",
    sort_by: "date",
  });

  const { data } = await axios.get(`${BASE_URL}/${page}?${queryParams}`, {
    timeout: 15000,
  });

  const results: AdzunaJob[] = data.results ?? [];

  return results.map((job) => ({
    title: job.title ?? "Untitled",
    company: job.company?.display_name ?? "Unknown",
    location: job.location?.display_name ?? "Ontario",
    description: cleanDescription(job.description ?? ""),
    url: job.redirect_url ?? "",
    source: "adzuna",
    salary_min: job.salary_min ? Math.round(job.salary_min) : null,
    salary_max: job.salary_max ? Math.round(job.salary_max) : null,
    posted_at: job.created ?? null,
    job_type: mapContractTime(job.contract_time),
    tags: job.category ? [job.category.label] : [],
    status: "new" as const,
  }));
}

// Adzuna uses "full_time"/"part_time" — map to our enum
// Adzuna descriptions come with HTML entities and extra whitespace — strip it down
function cleanDescription(raw: string): string {
  return raw
    .replace(/<[^>]+>/g, " ")       // strip HTML tags
    .replace(/&[a-z]+;/gi, " ")     // strip HTML entities like &amp;
    .replace(/\s+/g, " ")           // collapse whitespace
    .trim()
    .substring(0, 300);             // cap length — we just need a preview
}

function mapContractTime(time?: string): Job["job_type"] {
  switch (time) {
    case "full_time":
      return "full-time";
    case "part_time":
      return "part-time";
    case "contract":
      return "contract";
    default:
      return "full-time";
  }
}

import axios from "axios";
import type { AtsAdapter } from "./types";
import type { ParsedJob } from "@/lib/gemini/parse-url";

// Lever adapter — handles URLs from Lever-powered career pages.
// Used by Netflix, Quora, Eventbrite, and many tech companies.
// Examples:
//   - jobs.lever.co/{site}/{posting_id}
//   - {company}.eu.lever.co/{site}/{posting_id}
//
// Public API: https://api.lever.co/v0/postings/{site}/{posting_id}?mode=json
// Docs: https://hire.lever.co/developer/postings

function matches(url: URL): boolean {
  return url.hostname.toLowerCase().includes("lever.co");
}

// Lever URLs have the structure: jobs.lever.co/{site}/{postingId}
function parse(url: URL): { site: string; postingId: string } | null {
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length >= 2) {
    return { site: pathParts[0], postingId: pathParts[1] };
  }
  return null;
}

interface LeverPosting {
  id: string;
  text: string; // Job title
  hostedUrl?: string;
  descriptionPlain?: string;
  description?: string; // HTML
  categories?: {
    team?: string;
    location?: string;
    commitment?: string; // "Full-time", "Part-time", "Contract", "Intern", etc.
    department?: string;
    allLocations?: string[];
  };
  salaryRange?: {
    min: number;
    max: number;
    currency: string;
    interval: string; // "per-year-salary", "per-hour-wage", etc.
  };
  workplaceType?: string; // "on-site", "remote", "hybrid"
}

function mapToJob(p: LeverPosting, site: string): ParsedJob {
  const title = p.text ?? null;
  const location = p.categories?.location ?? p.categories?.allLocations?.[0] ?? null;

  // Description — prefer descriptionPlain if available, else strip HTML
  const description = (
    p.descriptionPlain ||
    (p.description ? p.description.replace(/<[^>]+>/g, " ") : "")
  )
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 300) || null;

  // Job type from commitment field
  const commitment = p.categories?.commitment?.toLowerCase() ?? "";
  let job_type: ParsedJob["job_type"] = "full-time";
  if (commitment.includes("intern") || (title ?? "").toLowerCase().match(/intern|co-?op/)) {
    job_type = "internship";
  } else if (commitment.includes("part")) {
    job_type = "part-time";
  } else if (commitment.includes("contract")) {
    job_type = "contract";
  } else if (commitment.includes("temp")) {
    job_type = "temporary";
  } else if (commitment.includes("full")) {
    job_type = "full-time";
  }

  // Duration from title
  let duration_value: number | null = null;
  let duration_unit: "months" | "years" | null = null;
  const durationMatch = (title ?? "").match(/(\d+)[\s-]?(month|year)s?/i);
  if (durationMatch) {
    duration_value = parseInt(durationMatch[1]);
    duration_unit = durationMatch[2].toLowerCase().startsWith("month") ? "months" : "years";
  }

  // Work mode from Lever's workplaceType
  let work_mode: ParsedJob["work_mode"] = null;
  const wt = p.workplaceType?.toLowerCase() ?? "";
  if (wt.includes("remote")) work_mode = "remote";
  else if (wt.includes("hybrid")) work_mode = "hybrid";
  else if (wt.includes("on-site") || wt.includes("onsite")) work_mode = "onsite";

  // Salary from Lever's structured salaryRange
  let salary_min: number | null = null;
  let salary_max: number | null = null;
  let salary_period: ParsedJob["salary_period"] = null;
  if (p.salaryRange) {
    salary_min = p.salaryRange.min;
    salary_max = p.salaryRange.max;
    const interval = p.salaryRange.interval?.toLowerCase() ?? "";
    if (interval.includes("hour")) salary_period = "hourly";
    else if (interval.includes("month")) salary_period = "monthly";
    else salary_period = "annual";
  }

  return {
    title,
    company: site.charAt(0).toUpperCase() + site.slice(1),
    location,
    description,
    job_type,
    work_mode,
    salary_min,
    salary_max,
    salary_period,
    deadline: null, // Lever doesn't expose deadlines
    duration_value,
    duration_unit,
    notes: null,
  };
}

export const leverAdapter: AtsAdapter = {
  name: "Lever",
  matches,
  async fetch(url: URL): Promise<ParsedJob> {
    const ids = parse(url);
    if (!ids) throw new Error("Couldn't parse Lever site/posting from URL.");

    const apiUrl = `https://api.lever.co/v0/postings/${ids.site}/${ids.postingId}?mode=json`;
    console.log("[lever] Fetching:", apiUrl);

    const { data } = await axios.get<LeverPosting>(apiUrl, {
      headers: { Accept: "application/json", "User-Agent": "HireON/1.0" },
      timeout: 10000,
    });

    return mapToJob(data, ids.site);
  },
};

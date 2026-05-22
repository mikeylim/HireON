import axios from "axios";
import type { AtsAdapter } from "./types";
import type { ParsedJob } from "@/lib/gemini/parse-url";

// Greenhouse adapter — handles URLs from Greenhouse-powered career pages.
// Used by Shopify, Stripe, Airbnb, Squarespace, many tech companies.
// Examples:
//   - boards.greenhouse.io/{company}/jobs/{id}
//   - {company}.greenhouse.io/{id}
//   - jobs.lever.co/{company}/{id} (NOT this, that's Lever)
//   - Custom embeds via job-boards.greenhouse.io
//
// Public API: https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs/{job_id}
// Docs: https://developers.greenhouse.io/job-board.html

function matches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  // boards.greenhouse.io, job-boards.greenhouse.io, {tenant}.greenhouse.io
  return host.includes("greenhouse.io");
}

// Extract { boardToken, jobId } from a Greenhouse URL
function parse(url: URL): { boardToken: string; jobId: string } | null {
  const host = url.hostname.toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);

  // Pattern 1: boards.greenhouse.io/{board_token}/jobs/{id}
  if (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") {
    if (pathParts[0] && pathParts[1] === "jobs" && pathParts[2]) {
      return { boardToken: pathParts[0], jobId: pathParts[2] };
    }
  }

  // Pattern 2: {tenant}.greenhouse.io/{id} (custom subdomain)
  if (host.endsWith(".greenhouse.io")) {
    const tenant = host.split(".")[0];
    if (tenant && tenant !== "boards" && tenant !== "job-boards") {
      // Job ID is usually the last numeric path segment
      const jobId = pathParts.find((p) => /^\d+$/.test(p));
      if (jobId) return { boardToken: tenant, jobId };
    }
  }

  return null;
}

interface GreenhouseJob {
  id: number;
  title: string;
  content: string; // HTML description
  location?: { name: string };
  departments?: { name: string }[];
  metadata?: { name: string; value: unknown }[];
  pay_input_ranges?: { min_cents: number; max_cents: number; currency_type: string }[];
}

function mapToJob(job: GreenhouseJob, boardToken: string): ParsedJob {
  const title = job.title || null;
  const location = job.location?.name || null;

  // Description — strip HTML, trim, cap
  const description = job.content
    ? job.content
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z]+;/gi, " ")
        .replace(/\s+/g, " ")
        .trim()
        .substring(0, 300)
    : null;

  // Job type from title keywords
  const titleLower = (title ?? "").toLowerCase();
  let job_type: ParsedJob["job_type"] = "full-time";
  if (titleLower.match(/intern|co-?op/)) job_type = "internship";
  else if (titleLower.includes("contract")) job_type = "contract";
  else if (titleLower.includes("part-time") || titleLower.includes("part time")) job_type = "part-time";
  else if (titleLower.includes("temporary")) job_type = "temporary";

  // Duration from title
  let duration_value: number | null = null;
  let duration_unit: "months" | "years" | null = null;
  const durationMatch = (title ?? "").match(/(\d+)[\s-]?(month|year)s?/i);
  if (durationMatch) {
    duration_value = parseInt(durationMatch[1]);
    duration_unit = durationMatch[2].toLowerCase().startsWith("month") ? "months" : "years";
  }

  // Work mode — scan location and content
  const descLower = (job.content ?? "").toLowerCase();
  const locLower = (location ?? "").toLowerCase();
  let work_mode: ParsedJob["work_mode"] = null;
  if (locLower.includes("remote") || descLower.includes("fully remote") || descLower.includes("100% remote")) {
    work_mode = "remote";
  } else if (descLower.includes("hybrid")) {
    work_mode = "hybrid";
  }

  // Salary from pay_input_ranges if present
  let salary_min: number | null = null;
  let salary_max: number | null = null;
  let salary_period: ParsedJob["salary_period"] = null;
  if (job.pay_input_ranges?.[0]) {
    const range = job.pay_input_ranges[0];
    // min_cents and max_cents are in cents — convert to dollars
    salary_min = Math.round(range.min_cents / 100);
    salary_max = Math.round(range.max_cents / 100);
    // Heuristic: if both numbers are under $1000, it's hourly. Otherwise annual.
    salary_period = salary_min < 1000 ? "hourly" : "annual";
  }

  // If no structured salary, try description text
  if (!salary_min) {
    const plain = (job.content ?? "").replace(/<[^>]+>/g, " ");
    const match = plain.match(/\$\s*([\d,]+(?:\.\d+)?)\s*[-–to]+\s*\$\s*([\d,]+(?:\.\d+)?)/);
    if (match) {
      salary_min = Math.round(parseFloat(match[1].replace(/,/g, "")));
      salary_max = Math.round(parseFloat(match[2].replace(/,/g, "")));
      salary_period = salary_min < 1000 ? "hourly" : "annual";
    }
  }

  return {
    title,
    company: boardToken.charAt(0).toUpperCase() + boardToken.slice(1),
    location,
    description,
    job_type,
    work_mode,
    salary_min,
    salary_max,
    salary_period,
    deadline: null, // Greenhouse doesn't expose deadlines via this endpoint
    duration_value,
    duration_unit,
    notes: null,
  };
}

export const greenhouseAdapter: AtsAdapter = {
  name: "Greenhouse",
  matches,
  async fetch(url: URL): Promise<ParsedJob> {
    const ids = parse(url);
    if (!ids) throw new Error("Couldn't parse Greenhouse board/job from URL.");

    const apiUrl = `https://boards-api.greenhouse.io/v1/boards/${ids.boardToken}/jobs/${ids.jobId}`;
    console.log("[greenhouse] Fetching:", apiUrl);

    const { data } = await axios.get<GreenhouseJob>(apiUrl, {
      headers: { Accept: "application/json", "User-Agent": "HireON/1.0" },
      timeout: 10000,
    });

    return mapToJob(data, ids.boardToken);
  },
};

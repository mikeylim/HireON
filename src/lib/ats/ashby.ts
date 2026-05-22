import axios from "axios";
import type { AtsAdapter } from "./types";
import type { ParsedJob } from "@/lib/gemini/parse-url";

// Ashby adapter — modern ATS popular with startups (Linear, Vercel, Replicate, etc.)
// Examples:
//   - jobs.ashbyhq.com/{org}/{job_id}
//
// Public API: https://api.ashbyhq.com/posting-api/job-posting/{org_id}
// Note: Ashby's posting-api returns ALL postings for a company,
// so we fetch the list and filter by ID. Lightweight enough for our use case.

function matches(url: URL): boolean {
  return url.hostname.toLowerCase().includes("ashbyhq.com");
}

function parse(url: URL): { org: string; jobId: string } | null {
  const pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts.length >= 2) {
    return { org: pathParts[0], jobId: pathParts[1] };
  }
  return null;
}

interface AshbyPosting {
  id: string;
  title: string;
  description?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  locationName?: string;
  employmentType?: string; // "FullTime", "PartTime", "Intern", "Contract", "Temporary"
  workplaceType?: string; // "Remote", "Hybrid", "OnSite"
  compensationTierSummary?: string; // e.g. "$120k - $180k"
  team?: string;
  department?: string;
}

function mapToJob(p: AshbyPosting, org: string): ParsedJob {
  const title = p.title ?? null;
  const location = p.locationName ?? null;

  const description = (
    p.descriptionPlain ||
    (p.descriptionHtml ? p.descriptionHtml.replace(/<[^>]+>/g, " ") : "") ||
    p.description ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
    .substring(0, 300) || null;

  // Job type from employmentType field
  const empType = p.employmentType?.toLowerCase() ?? "";
  let job_type: ParsedJob["job_type"] = "full-time";
  if (empType.includes("intern") || (title ?? "").toLowerCase().match(/intern|co-?op/)) {
    job_type = "internship";
  } else if (empType.includes("part")) {
    job_type = "part-time";
  } else if (empType.includes("contract")) {
    job_type = "contract";
  } else if (empType.includes("temp")) {
    job_type = "temporary";
  } else if (empType.includes("full")) {
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

  // Work mode
  let work_mode: ParsedJob["work_mode"] = null;
  const wt = p.workplaceType?.toLowerCase() ?? "";
  if (wt.includes("remote")) work_mode = "remote";
  else if (wt.includes("hybrid")) work_mode = "hybrid";
  else if (wt.includes("onsite") || wt.includes("on-site")) work_mode = "onsite";

  // Salary from compensationTierSummary (e.g. "$120k - $180k" or "$50/hr - $80/hr")
  let salary_min: number | null = null;
  let salary_max: number | null = null;
  let salary_period: ParsedJob["salary_period"] = null;
  if (p.compensationTierSummary) {
    const text = p.compensationTierSummary;
    const isHourly = /\/?hr|hour|hourly/i.test(text);
    const matches = text.match(/\$\s*([\d,.]+)\s*k?\s*[-–to]+\s*\$\s*([\d,.]+)\s*k?/i);
    if (matches) {
      let min = parseFloat(matches[1].replace(/,/g, ""));
      let max = parseFloat(matches[2].replace(/,/g, ""));
      // If the source had "k" suffix, multiply
      if (/k/i.test(text)) {
        min *= 1000;
        max *= 1000;
      }
      salary_min = Math.round(min);
      salary_max = Math.round(max);
      salary_period = isHourly ? "hourly" : "annual";
    }
  }

  return {
    title,
    company: org.charAt(0).toUpperCase() + org.slice(1),
    location,
    description,
    job_type,
    work_mode,
    salary_min,
    salary_max,
    salary_period,
    deadline: null,
    duration_value,
    duration_unit,
    notes: null,
  };
}

export const ashbyAdapter: AtsAdapter = {
  name: "Ashby",
  matches,
  async fetch(url: URL): Promise<ParsedJob> {
    const ids = parse(url);
    if (!ids) throw new Error("Couldn't parse Ashby org/job from URL.");

    // Ashby's public API returns a list of all postings for an org;
    // we filter by jobId on the client side.
    const apiUrl = `https://api.ashbyhq.com/posting-api/job-posting/${ids.org}`;
    console.log("[ashby] Fetching:", apiUrl);

    const { data } = await axios.get<{ jobPostings: AshbyPosting[] }>(apiUrl, {
      headers: { Accept: "application/json", "User-Agent": "HireON/1.0" },
      timeout: 10000,
    });

    const posting = data.jobPostings?.find((p) => p.id === ids.jobId);
    if (!posting) throw new Error("Ashby posting not found.");

    return mapToJob(posting, ids.org);
  },
};

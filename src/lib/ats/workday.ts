import axios from "axios";
import type { AtsAdapter } from "./types";
import type { ParsedJob } from "@/lib/gemini/parse-url";

// Workday adapter — handles URLs from any Workday-powered career site.
// Examples:
//   - jobs.bmo.com/ca/en/job/BOMOGLOBALR260013663EXTERNALENCA/...
//   - rbc.wd3.myworkdayjobs.com/RBC/job/Toronto/Software-Engineer_R-12345
//   - careers.scotiabank.com/Scotiabank-Career-Site/job/Toronto/...
//
// Workday exposes a JSON CXS API at /wday/cxs/{tenant}/{site}/job/{externalId}
// that returns structured data without needing to render JavaScript.

// Recognize all known Workday URL shapes by sniffing the path/host
function matches(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  const path = url.pathname; // Don't lowercase — we need to detect uppercase job IDs

  // Direct workday.com subdomain (e.g. company.wd3.myworkdayjobs.com)
  if (host.includes("myworkdayjobs.com")) return true;

  // Custom-branded Workday sites have a path like /job/{externalId} where
  // the externalId is uppercase alphanumeric (e.g. BOMOGLOBALR260013663EXTERNALENCA).
  // Use case-insensitive flag and require some uppercase chars in the ID.
  const hasJobPath = /\/job\/[A-Z][A-Z0-9_-]{5,}/i.test(path);
  const hasWdayPath = path.toLowerCase().includes("/wday/cxs/");
  // Stronger signal: the job ID looks like a Workday external ID (long, has uppercase)
  const looksLikeWorkdayId = /\/[A-Z0-9]{10,}/.test(path);
  return hasJobPath || hasWdayPath || looksLikeWorkdayId;
}

// Extract the {tenant} and {site} segments from a Workday URL.
// On myworkdayjobs.com, tenant = first subdomain, site = first path segment.
// On custom branded sites, we have to guess — usually the host without "jobs." or
// "careers." prefix, and the site is the second-to-last "ca/en" or similar.
// Returns null if we can't figure it out.
function parseTenantAndSite(url: URL): { tenant: string; site: string } | null {
  const host = url.hostname.toLowerCase();
  const pathParts = url.pathname.split("/").filter(Boolean);

  // Case 1: standard myworkdayjobs.com — tenant.wd{N}.myworkdayjobs.com/{site}/...
  if (host.includes("myworkdayjobs.com")) {
    const tenant = host.split(".")[0];
    const site = pathParts[0];
    if (tenant && site) return { tenant, site };
  }

  // Case 2: custom branded — try to derive tenant from host
  // e.g. jobs.bmo.com → tenant guess = "bmo"
  // e.g. careers.scotiabank.com → tenant guess = "scotiabank"
  const hostParts = host.split(".");
  if (hostParts.length >= 2) {
    // Find the most likely tenant name (the second-level domain)
    const tenant = hostParts[hostParts.length - 2];

    // Site is usually one of the first non-locale path segments
    // Skip locale-like segments (ca, en, ca/en) to find the actual site key
    const localePattern = /^(ca|en|fr|us|en-us|en-ca|fr-ca|en-gb)$/i;
    let site: string | undefined;
    for (const part of pathParts) {
      if (part === "job") break;
      if (!localePattern.test(part)) {
        site = part;
        break;
      }
    }
    // If we couldn't find a non-locale site, fall back to a common default
    if (!site) site = "External";
    if (tenant) return { tenant, site };
  }

  return null;
}

// Pull the externalJobId out of the URL — the segment right after /job/
function extractJobId(url: URL): string | null {
  const match = url.pathname.match(/\/job\/(?:[^/]+\/)*([A-Z0-9_-]+(?:EXTERNAL[A-Z]*)?)/i);
  return match?.[1] ?? null;
}

// Workday's JSON response is heavily nested. This pulls out the fields we care about.
// Workday returns descriptive HTML in `jobDescription` and structured metadata in
// `jobPostingInfo` plus tabs of `additionalLocations`, etc.
function mapWorkdayToJob(json: Record<string, unknown>): ParsedJob {
  const info = (json.jobPostingInfo ?? {}) as Record<string, unknown>;

  const title = (info.title as string | undefined) ?? null;
  const location = (info.location as string | undefined) ?? null;

  // Description: Workday returns HTML — strip tags and trim to 300 chars
  const rawDesc = (info.jobDescription as string | undefined) ?? "";
  const description = rawDesc
    ? rawDesc.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().substring(0, 300)
    : null;

  // Job type: Workday uses fields like "timeType" ("Full time" / "Part time")
  const timeType = (info.timeType as string | undefined)?.toLowerCase() ?? "";
  let job_type: ParsedJob["job_type"] = null;
  if (timeType.includes("full")) job_type = "full-time";
  else if (timeType.includes("part")) job_type = "part-time";

  // Look for intern/co-op signals in the title
  const titleLower = (title ?? "").toLowerCase();
  if (titleLower.includes("intern") || titleLower.includes("co-op") || titleLower.includes("coop")) {
    job_type = "internship";
  } else if (titleLower.includes("contract") || titleLower.includes("temporary")) {
    job_type = "contract";
  }

  // Duration extraction from title (e.g. "8 Months", "12-Month")
  let duration_value: number | null = null;
  let duration_unit: "months" | "years" | null = null;
  const durationMatch = (title ?? "").match(/(\d+)[\s-]?(month|year)s?/i);
  if (durationMatch) {
    duration_value = parseInt(durationMatch[1]);
    duration_unit = durationMatch[2].toLowerCase().startsWith("month") ? "months" : "years";
  }

  // Salary: Workday usually has a payRangeText or compensation in jobDescription
  // Try the structured field first
  let salary_min: number | null = null;
  let salary_max: number | null = null;
  let salary_period: ParsedJob["salary_period"] = null;
  const payText =
    (info.payRangeText as string | undefined) ??
    (info.compensation as string | undefined) ??
    "";

  // Combine payText + jobDescription for salary parsing
  const combinedText = `${payText} ${rawDesc.replace(/<[^>]+>/g, " ")}`;
  const salaryMatch = combinedText.match(
    /\$?([\d,]+(?:\.\d+)?)\s*[-–to]+\s*\$?([\d,]+(?:\.\d+)?)/
  );
  if (salaryMatch) {
    salary_min = Math.round(parseFloat(salaryMatch[1].replace(/,/g, "")));
    salary_max = Math.round(parseFloat(salaryMatch[2].replace(/,/g, "")));
    // Heuristic: if both numbers are < 1000, it's likely hourly
    salary_period = salary_min < 1000 ? "hourly" : "annual";
  }

  // Application deadline
  const deadlineRaw =
    (info.endDate as string | undefined) ??
    (info.postingEndDate as string | undefined) ??
    null;
  let deadline: string | null = null;
  if (deadlineRaw) {
    // Workday returns ISO dates — extract YYYY-MM-DD
    const d = new Date(deadlineRaw);
    if (!isNaN(d.getTime())) {
      deadline = d.toISOString().substring(0, 10);
    }
  }

  // Work mode: scan jobDescription for "remote" / "hybrid" / "onsite"
  const descLower = rawDesc.toLowerCase();
  let work_mode: ParsedJob["work_mode"] = null;
  if (descLower.includes("fully remote") || descLower.includes("100% remote")) {
    work_mode = "remote";
  } else if (descLower.includes("hybrid")) {
    work_mode = "hybrid";
  } else if (descLower.includes("on-site") || descLower.includes("onsite") || descLower.includes("in-office")) {
    work_mode = "onsite";
  }

  // Notes: surface application-specific info
  // Workday often includes recruiter contact in the description's last paragraph
  // For now, we'll leave notes empty and let Gemini handle it if needed
  // (or extract recruiter/posting ID/external ID as a starting point)
  const externalId = (info.externalUrl as string | undefined)?.split("/").pop() ?? null;
  const notes = externalId ? `Posting ID: ${externalId}` : null;

  // Company name isn't typically in the Workday JSON — we'll derive from the
  // hostname later in the route handler
  return {
    title,
    company: null,
    location,
    description,
    job_type,
    work_mode,
    salary_min,
    salary_max,
    salary_period,
    deadline,
    duration_value,
    duration_unit,
    notes,
  };
}

// Try to fetch the Workday JSON for this job URL.
// Returns null if the API endpoint doesn't exist or returns an error.
async function fetchWorkdayJson(url: URL): Promise<Record<string, unknown> | null> {
  const tenantSite = parseTenantAndSite(url);
  const jobId = extractJobId(url);

  if (!tenantSite || !jobId) {
    console.log("[workday] Couldn't parse tenant/site/jobId from URL:", url.href);
    return null;
  }

  // Workday's CXS API is at /wday/cxs/{tenant}/{site}/job/{externalId}
  // We try the same host first, then fall back to {tenant}.wd*.myworkdayjobs.com
  const candidates = [
    `${url.protocol}//${url.host}/wday/cxs/${tenantSite.tenant}/${tenantSite.site}/job/${jobId}`,
    `${url.protocol}//${url.host}/wday/cxs/${tenantSite.tenant}/${tenantSite.site}/job/${jobId.replace(/EXTERNAL[A-Z]*$/, "")}`,
  ];

  for (const apiUrl of candidates) {
    try {
      const { data } = await axios.get(apiUrl, {
        headers: {
          Accept: "application/json",
          "User-Agent": "HireON/1.0",
        },
        timeout: 10000,
        validateStatus: (s) => s < 500,
      });
      if (data && typeof data === "object") {
        console.log("[workday] Got JSON from:", apiUrl);
        return data;
      }
    } catch (err) {
      console.log("[workday] Failed:", apiUrl, err instanceof Error ? err.message : err);
    }
  }
  return null;
}

export const workdayAdapter: AtsAdapter = {
  name: "Workday",
  matches,
  async fetch(url: URL): Promise<ParsedJob> {
    const json = await fetchWorkdayJson(url);
    if (!json) {
      throw new Error("Couldn't reach Workday API for this URL.");
    }
    return mapWorkdayToJob(json);
  },
};

import axios from "axios";
import * as cheerio from "cheerio";
import type { AtsAdapter } from "./types";
import type { ParsedJob } from "@/lib/gemini/parse-url";

// JSON-LD adapter — handles ANY job posting site that embeds schema.org
// JobPosting markup. This is a Google Jobs requirement, so almost every modern
// careers site (Phenom, Greenhouse, Lever, Workday-with-JSON-LD, Ashby, custom
// sites) includes it. Works regardless of how the page is rendered because the
// JSON-LD is in the initial HTML.
//
// Schema reference: https://schema.org/JobPosting

// schema.org JobPosting type (loose typing — fields vary by site)
interface JsonLdJobPosting {
  "@type"?: string | string[];
  title?: string;
  hiringOrganization?: { name?: string } | string;
  jobLocation?: JsonLdLocation | JsonLdLocation[];
  description?: string;
  employmentType?: string | string[];
  baseSalary?: { value?: { minValue?: number; maxValue?: number; unitText?: string } };
  validThrough?: string;
  datePosted?: string;
  jobLocationType?: string; // "TELECOMMUTE" for remote
}

interface JsonLdLocation {
  address?: {
    addressLocality?: string;
    addressRegion?: string;
    addressCountry?: string;
  };
}

function matches(): boolean {
  // This adapter is a fallback that requires fetching the page first,
  // so we always say it matches — the route will try it after specific
  // adapters (Workday, etc.) and before scraping + Gemini.
  return true;
}

// Find and extract JobPosting JSON-LD from page HTML.
// Returns null if no valid JobPosting schema is present.
function findJobPosting(html: string): JsonLdJobPosting | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const raw = $(script).contents().text();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      // Could be a single object or an array of objects, or a @graph
      const candidates: JsonLdJobPosting[] = Array.isArray(parsed)
        ? parsed
        : parsed["@graph"]
          ? parsed["@graph"]
          : [parsed];

      for (const c of candidates) {
        const type = c["@type"];
        const isJobPosting = Array.isArray(type)
          ? type.includes("JobPosting")
          : type === "JobPosting";
        if (isJobPosting) return c;
      }
    } catch {
      // Skip malformed JSON-LD
    }
  }
  return null;
}

// Map schema.org JobPosting → our ParsedJob shape
function mapToJob(job: JsonLdJobPosting): ParsedJob {
  const title = job.title ?? null;

  // Company from hiringOrganization (can be string or object)
  let company: string | null = null;
  if (typeof job.hiringOrganization === "string") {
    company = job.hiringOrganization;
  } else if (job.hiringOrganization?.name) {
    company = job.hiringOrganization.name;
  }

  // Location — first locality if array
  let location: string | null = null;
  const loc = Array.isArray(job.jobLocation) ? job.jobLocation[0] : job.jobLocation;
  if (loc?.address) {
    const parts = [
      loc.address.addressLocality,
      loc.address.addressRegion,
      loc.address.addressCountry,
    ].filter(Boolean);
    if (parts.length > 0) location = parts.join(", ");
  }

  // Description — HTML-decode entities, strip tags, remove metadata prefix, trim
  const rawDesc = job.description ?? "";
  const description = rawDesc
    ? stripMetadataPrefix(
        decodeEntities(rawDesc)
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
      ).substring(0, 300)
    : null;

  // Employment type → our job_type enum
  const empType = (Array.isArray(job.employmentType)
    ? job.employmentType.join(" ")
    : job.employmentType ?? ""
  ).toLowerCase();
  let job_type: ParsedJob["job_type"] = null;
  if (empType.includes("intern") || (title ?? "").toLowerCase().match(/intern|co-?op/)) {
    job_type = "internship";
  } else if (empType.includes("full")) {
    job_type = "full-time";
  } else if (empType.includes("part")) {
    job_type = "part-time";
  } else if (empType.includes("contract") || empType.includes("contractor")) {
    job_type = "contract";
  } else if (empType.includes("temp")) {
    job_type = "temporary";
  }

  // Duration from title (e.g. "8 Months", "12-Month Co-op")
  let duration_value: number | null = null;
  let duration_unit: "months" | "years" | null = null;
  const durationMatch = (title ?? "").match(/(\d+)[\s-]?(month|year)s?/i);
  if (durationMatch) {
    duration_value = parseInt(durationMatch[1]);
    duration_unit = durationMatch[2].toLowerCase().startsWith("month") ? "months" : "years";
  }

  // Work mode
  let work_mode: ParsedJob["work_mode"] = null;
  if (job.jobLocationType === "TELECOMMUTE") {
    work_mode = "remote";
  } else {
    const fullText = `${title} ${rawDesc}`.toLowerCase();
    if (fullText.includes("fully remote") || fullText.includes("100% remote")) work_mode = "remote";
    else if (fullText.includes("hybrid")) work_mode = "hybrid";
  }

  // Salary
  let salary_min: number | null = null;
  let salary_max: number | null = null;
  let salary_period: ParsedJob["salary_period"] = null;
  if (job.baseSalary?.value) {
    const v = job.baseSalary.value;
    salary_min = v.minValue ?? null;
    salary_max = v.maxValue ?? null;
    const unit = v.unitText?.toUpperCase() ?? "";
    if (unit === "HOUR") salary_period = "hourly";
    else if (unit === "MONTH") salary_period = "monthly";
    else salary_period = "annual";
  }

  // If no structured salary, try to extract from description text
  if (!salary_min) {
    const decoded = decodeEntities(rawDesc).replace(/<[^>]+>/g, " ");
    const salaryMatch = decoded.match(
      /\$\s*([\d,]+(?:\.\d+)?)\s*[-–to]+\s*\$\s*([\d,]+(?:\.\d+)?)/
    );
    if (salaryMatch) {
      salary_min = Math.round(parseFloat(salaryMatch[1].replace(/,/g, "")));
      salary_max = Math.round(parseFloat(salaryMatch[2].replace(/,/g, "")));
      salary_period = salary_min < 1000 ? "hourly" : "annual";
    }
  }

  // Deadline — schema.org uses `validThrough`. Also scan description for explicit deadlines.
  let deadline: string | null = null;
  if (job.validThrough) {
    const d = new Date(job.validThrough);
    if (!isNaN(d.getTime())) deadline = d.toISOString().substring(0, 10);
  }
  if (!deadline) {
    const decoded = decodeEntities(rawDesc).replace(/<[^>]+>/g, " ");
    // Match "Application Deadline: 05/24/2026" or "Apply by May 24, 2026"
    const match = decoded.match(
      /(?:application deadline|apply by|closing date|closes)[:\s]+(\d{1,2}\/\d{1,2}\/\d{4}|\w+ \d{1,2},?\s*\d{4})/i
    );
    if (match) {
      const d = new Date(match[1]);
      if (!isNaN(d.getTime())) deadline = d.toISOString().substring(0, 10);
    }
  }

  return {
    title,
    company,
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
    notes: null, // JSON-LD doesn't typically have application-specific notes
  };
}

// Decode common HTML entities (the BMO description has &lt; &gt; &amp; etc.)
function decodeEntities(html: string): string {
  return html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

// Strip leading metadata blocks like "Application Deadline: ... Address: ...
// Job Family Group: ..." that some ATS systems prepend to job descriptions.
//
// Strategy: iteratively chop off the leading "Label: value" segments. Each
// value ends at WHICHEVER COMES FIRST:
//   (a) the next known metadata label
//   (b) the start of an obvious prose phrase ("As a", "We are", "About the", etc.)
// This handles the tricky case where the LAST metadata label has no next-label
// marker to anchor against (e.g. "Job Family Group: Technology As a co-op...").
function stripMetadataPrefix(text: string): string {
  const LABELS = [
    "Application Deadline",
    "Address",
    "Job Family Group",
    "Job Category",
    "Department",
    "Posting Date",
    "Date Posted",
    "Reports To",
    "Hours per Week",
    "Work Hours",
    "Grade Level",
    "Pay Grade",
    "Salary Grade",
    "Pay Type",
    "Requisition",
    "Req ID",
    "Job ID",
    "Posting ID",
  ];

  // Pattern that matches any of our known labels followed by a colon
  const anyLabelRegex = new RegExp(`(${LABELS.join("|")})\\s*:`, "i");
  // Pattern that matches common job-description opening phrases
  const proseStartRegex =
    /\b(As (?:a|an|the)\s|The (?:role|position|opportunity|team)|About (?:the|this|us)|We are|We're|Are you|Join (?:us|our)|At [A-Z][a-z]+,? we|Position Summary|Role Summary|Job Summary|Description:?\s)/;

  let cleaned = text.trim();
  let prev = "";

  // Iterate up to 15 times (safety bound — there shouldn't be that many metadata fields)
  for (let i = 0; i < 15 && cleaned !== prev; i++) {
    prev = cleaned;

    // Does the current text start with one of our known labels?
    const leadingLabel = cleaned.match(
      new RegExp(`^(${LABELS.join("|")})\\s*:`, "i")
    );
    if (!leadingLabel) break;

    const afterLabel = cleaned.slice(leadingLabel[0].length);

    // Where does this label's value end? Find next label or prose start.
    const nextLabel = afterLabel.match(anyLabelRegex);
    const nextProse = afterLabel.match(proseStartRegex);

    const nextLabelIdx = nextLabel?.index ?? -1;
    const nextProseIdx = nextProse?.index ?? -1;

    let endIdx: number;
    if (nextLabelIdx !== -1 && nextProseIdx !== -1) {
      endIdx = Math.min(nextLabelIdx, nextProseIdx);
    } else if (nextLabelIdx !== -1) {
      endIdx = nextLabelIdx;
    } else if (nextProseIdx !== -1) {
      endIdx = nextProseIdx;
    } else {
      // No marker found — likely the rest is metadata value with no clear end.
      // Stop here to avoid stripping the entire description by accident.
      break;
    }

    cleaned = afterLabel.slice(endIdx).trim();
  }

  return cleaned;
}

export const jsonLdAdapter: AtsAdapter = {
  name: "JSON-LD",
  matches,
  async fetch(url: URL): Promise<ParsedJob> {
    const { data: html } = await axios.get(url.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      timeout: 15000,
      maxRedirects: 5,
    });

    const job = findJobPosting(html);
    if (!job) {
      throw new Error("No JSON-LD JobPosting found on this page.");
    }
    return mapToJob(job);
  },
};

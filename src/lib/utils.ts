import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Derive a useful source label from a posting URL. Known job boards and ATS
// platforms get their own label; employer-hosted links are company websites.
export function inferJobSource(url: string): string {
  if (!url.trim()) return "";

  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }

  const sources: Array<[domain: string, label: string]> = [
    ["jobbank.gc.ca", "Job Bank"],
    ["adzuna.ca", "Adzuna"],
    ["adzuna.com", "Adzuna"],
    ["jooble.org", "Jooble"],
    ["remotive.com", "Remotive"],
    ["indeed.ca", "Indeed"],
    ["indeed.com", "Indeed"],
    ["linkedin.com", "LinkedIn"],
    ["glassdoor.ca", "Glassdoor"],
    ["glassdoor.com", "Glassdoor"],
    ["greenhouse.io", "Greenhouse"],
    ["lever.co", "Lever"],
    ["ashbyhq.com", "Ashby"],
    ["myworkdayjobs.com", "Workday"],
  ];

  const match = sources.find(
    ([domain]) => hostname === domain || hostname.endsWith(`.${domain}`)
  );

  return match?.[1] ?? "Company Website";
}

// Capitalize first letter of each word — "full stack developer" → "Full Stack Developer"
export function titleCase(str: string): string {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Today's date in the user's LOCAL timezone, formatted as "YYYY-MM-DD".
// Use this for auto-setting calendar-date fields (applied_date, rejected_date,
// archived_date, offer_date, deadlines) so they reflect the user's calendar day
// instead of UTC's calendar day — which can differ when the user is in the
// evening of their local timezone.
export function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parse a date string safely, handling the calendar-date case.
//
// Date-only values like "2026-05-23" or timestamps that are exactly UTC
// midnight ("2026-05-23T00:00:00Z") represent a CALENDAR DATE the user picked,
// not a specific moment in time. Native `new Date(value)` parses these as UTC,
// which causes timezone shifts (e.g. May 23 UTC = May 22 evening in Toronto).
//
// We detect that case and return a Date set to LOCAL midnight on that
// calendar date. For real timestamps with a meaningful time component
// (e.g. "2026-05-23T14:30:00-04:00"), we use native parsing as-is.
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  // Date-only ("2026-05-23") or UTC-midnight timestamp — treat as local calendar date
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T00:00:00(?:\.000)?(?:Z|\+00:?00)?)?$/
  );
  if (match) {
    return new Date(
      parseInt(match[1]),
      parseInt(match[2]) - 1, // months are 0-indexed
      parseInt(match[3])
    );
  }

  // Real timestamp — parse normally
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// Human-readable relative time. Examples:
//   "Today", "Yesterday", "3 days ago", "in 5 days", "2 weeks ago"
// Returns null for invalid dates so callers can hide the label entirely.
export function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = parseDate(iso);
  if (!date) return null;

  const now = new Date();
  // Compare at day granularity so "today" doesn't depend on the hour
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round(
    (date.getTime() - new Date(now.toDateString()).getTime()) / dayMs
  );

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  if (diffDays > 0) {
    // Future
    if (diffDays < 7) return `in ${diffDays} days`;
    if (diffDays < 30) return `in ${Math.round(diffDays / 7)} weeks`;
    if (diffDays < 365) return `in ${Math.round(diffDays / 30)} months`;
    return `in ${Math.round(diffDays / 365)} years`;
  } else {
    // Past
    const abs = Math.abs(diffDays);
    if (abs < 7) return `${abs} days ago`;
    if (abs < 30) return `${Math.round(abs / 7)} weeks ago`;
    if (abs < 365) return `${Math.round(abs / 30)} months ago`;
    return `${Math.round(abs / 365)} years ago`;
  }
}

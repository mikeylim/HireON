import axios from "axios";
import { XMLParser } from "fast-xml-parser";
import * as cheerio from "cheerio";
import type { Job } from "@/lib/types/job";

// Job Bank Canada Atom feed — free, no API key, ~14 results per query
const FEED_URL =
  "https://www.jobbank.gc.ca/jobsearch/feed/jobSearchRSSfeed";

interface FeedParams {
  keyword: string;
  location?: string; // e.g. "Toronto, ON"
  province?: string; // e.g. "ON"
  sort?: "D" | "M"; // D = date, M = relevance
}

// ─── Atom Feed: grab the latest postings for a search ───

interface FeedEntry {
  title: string | { "#text": string };
  link: { "@_href": string } | Array<{ "@_href": string }>;
  id: string;
  updated: string;
  summary: string | { "#text": string };
}

function extractText(field: string | { "#text": string }): string {
  return typeof field === "string" ? field : field["#text"] ?? "";
}

export async function fetchJobBankFeed(
  params: FeedParams
): Promise<Partial<Job>[]> {
  const queryParams = new URLSearchParams({
    searchstring: params.keyword,
    locationstring: params.location ?? "Toronto, ON",
    fprov: params.province ?? "ON",
    sort: params.sort ?? "D",
  });

  const { data: xml } = await axios.get(`${FEED_URL}?${queryParams}`, {
    headers: {
      // Polite user-agent so we don't look like a bot
      "User-Agent": "HireON/1.0 (personal job search tool)",
      Accept: "application/atom+xml",
    },
    timeout: 15000,
  });

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const parsed = parser.parse(xml);

  // The feed might have 0, 1, or many entries
  const feed = parsed?.feed;
  if (!feed?.entry) return [];

  const entries: FeedEntry[] = Array.isArray(feed.entry)
    ? feed.entry
    : [feed.entry];

  return entries.map((entry) => {
    const title = extractText(entry.title);
    const summary = extractText(entry.summary);

    // Pull the posting URL from the link element
    const link = Array.isArray(entry.link) ? entry.link[0] : entry.link;
    const url = link?.["@_href"] ?? "";

    // Parse structured info out of the summary HTML
    // Summary looks like: "Job number: 123<br/>Location: Toronto (ON)<br/>Employer: Acme..."
    const { company, location, salary } = parseSummary(summary);

    return {
      title,
      company,
      location,
      url,
      source: "jobbank",
      salary_min: salary.min,
      salary_max: salary.max,
      posted_at: entry.updated || null,
      status: "new" as const,
      description: "", // feed doesn't include real descriptions — only metadata
    };
  });
}

// ─── Parse the summary HTML blob from the feed ───

function parseSummary(html: string): {
  company: string;
  location: string;
  salary: { min: number | null; max: number | null };
} {
  // Strip HTML tags for easier regex matching
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  // Use lookahead to stop at the next field label (or end of string)
  // The summary follows the pattern: "Job number: X Location: Y Employer: Z Salary: W"
  const companyMatch = text.match(/Employer:\s*(.+?)(?=\s*(?:Salary|Location|Job number):|$)/i);
  const company = companyMatch?.[1]?.trim() ?? "Unknown";

  const locationMatch = text.match(/Location:\s*(.+?)(?=\s*(?:Salary|Employer|Job number):|$)/i);
  const location = locationMatch?.[1]?.trim() ?? "Ontario";

  const salary = parseSalary(text);

  return { company, location, salary };
}

// ─── Salary parsing — handles hourly/annual, ranges, single values ───

function parseSalary(text: string): {
  min: number | null;
  max: number | null;
} {
  const salaryMatch = text.match(
    /Salary:\s*\$?([\d,]+(?:\.\d+)?)\s*(?:to\s*\$?([\d,]+(?:\.\d+)?))?\s*(hourly|annually|yearly|weekly|monthly)?/i
  );

  if (!salaryMatch) return { min: null, max: null };

  let min = parseFloat(salaryMatch[1].replace(/,/g, ""));
  let max = salaryMatch[2]
    ? parseFloat(salaryMatch[2].replace(/,/g, ""))
    : null;
  const period = salaryMatch[3]?.toLowerCase();

  // Convert everything to annual for consistent comparison
  if (period === "hourly") {
    min = Math.round(min * 40 * 52); // 40hrs/week, 52 weeks
    max = max ? Math.round(max * 40 * 52) : null;
  } else if (period === "weekly") {
    min = Math.round(min * 52);
    max = max ? Math.round(max * 52) : null;
  } else if (period === "monthly") {
    min = Math.round(min * 12);
    max = max ? Math.round(max * 12) : null;
  }

  // Always round to integer — the DB column is integer and some annual
  // salaries come through with decimals (e.g. $130,709.76)
  return {
    min: Math.round(min),
    max: max ? Math.round(max) : null,
  };
}

// ─── Scrape a single job posting page for full details ───
// Use this to enrich the basic feed data when a user clicks into a job

export async function scrapeJobBankPosting(
  jobUrl: string
): Promise<Partial<Job>> {
  const { data: html } = await axios.get(jobUrl, {
    headers: {
      "User-Agent": "HireON/1.0 (personal job search tool)",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(html);

  // The page structure uses specific selectors for job details
  const title = $("h1.title, .noc-title, h1").first().text().trim();
  const company =
    $('span[property="hiringOrganization"] span[property="name"]')
      .text()
      .trim() ||
    $(".employer-name").text().trim() ||
    "Unknown";

  const location =
    $('span[property="jobLocation"] span[property="address"]')
      .text()
      .trim() ||
    $(".job-posting-location").text().trim() ||
    "Ontario";

  // Grab the full description text
  const description =
    $('div[property="description"]').text().trim() ||
    $(".job-posting-detail-requirements").text().trim() ||
    "";

  // Look for work mode hints in the description
  const descLower = description.toLowerCase();
  const work_mode = descLower.includes("remote")
    ? ("remote" as const)
    : descLower.includes("hybrid")
      ? ("hybrid" as const)
      : ("onsite" as const);

  return {
    title: title || undefined,
    company,
    location,
    description,
    work_mode,
    url: jobUrl,
    source: "jobbank",
  };
}

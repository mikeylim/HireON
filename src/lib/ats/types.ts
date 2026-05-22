// Shared types for ATS (Applicant Tracking System) platform adapters
// Each adapter takes a user-facing job URL and returns structured job fields
// by calling the platform's own JSON API instead of scraping HTML.

import type { ParsedJob } from "@/lib/gemini/parse-url";

export type AtsPlatform =
  | "workday"
  | "greenhouse"
  | "lever"
  | "ashby"
  | "smartrecruiters";

export interface AtsAdapter {
  // Human-readable name for logging
  name: string;
  // True if this adapter can handle the given URL
  matches(url: URL): boolean;
  // Fetch and parse the job posting using the platform's JSON API
  fetch(url: URL): Promise<ParsedJob>;
}

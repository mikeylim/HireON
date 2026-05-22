// Central registry of ATS adapters. The route handler tries each one in order
// and uses the first that matches the URL. If none match, falls back to scraping.

import { workdayAdapter } from "./workday";
import { greenhouseAdapter } from "./greenhouse";
import { leverAdapter } from "./lever";
import { ashbyAdapter } from "./ashby";
import { jsonLdAdapter } from "./jsonld";
import type { AtsAdapter } from "./types";

// Order matters: platform-specific adapters first (faster, more structured),
// JSON-LD adapter last as universal fallback for any site with schema.org markup.
export const adapters: AtsAdapter[] = [
  workdayAdapter,
  greenhouseAdapter,
  leverAdapter,
  ashbyAdapter,
  jsonLdAdapter, // universal — works on most modern career sites
];

// Find the first adapter that recognizes this URL, or null if none match
export function findAdapter(url: URL): AtsAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null;
}

// Try every applicable adapter in sequence — returns the first one that
// successfully extracts a non-empty result, or null if none succeed.
export async function tryAdapters(url: URL): Promise<{
  data: import("@/lib/gemini/parse-url").ParsedJob;
  adapterName: string;
} | null> {
  for (const adapter of adapters) {
    if (!adapter.matches(url)) continue;
    try {
      const data = await adapter.fetch(url);
      const allNull = Object.values(data).every((v) => v === null);
      if (!allNull) {
        return { data, adapterName: adapter.name };
      }
    } catch {
      // Try the next adapter
    }
  }
  return null;
}

export type { AtsAdapter } from "./types";

const CANADIAN_REGION_ALIASES: ReadonlyArray<ReadonlyArray<string>> = [
  ["ab", "alberta"],
  ["bc", "british columbia"],
  ["mb", "manitoba"],
  ["nb", "new brunswick"],
  ["nl", "newfoundland and labrador", "newfoundland"],
  ["ns", "nova scotia"],
  ["nt", "northwest territories"],
  ["nu", "nunavut"],
  ["on", "ontario"],
  ["pe", "prince edward island"],
  ["qc", "quebec"],
  ["sk", "saskatchewan"],
  ["yt", "yukon"],
];

const CANADIAN_REGION_TERMS = CANADIAN_REGION_ALIASES.flat();
const REMOTE_TERMS = ["remote", "worldwide", "anywhere", "global"];

function normalizeLocation(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function splitLocation(value: string): string[] {
  return value
    .split(/[,;|/]+/)
    .map(normalizeLocation)
    .filter(Boolean);
}

function containsPhrase(value: string, phrase: string): boolean {
  return ` ${value} `.includes(` ${phrase} `);
}

function containsAny(value: string, terms: readonly string[]): boolean {
  return terms.some((term) => containsPhrase(value, term));
}

function getCanadianRegionTerms(value: string): readonly string[] | null {
  return CANADIAN_REGION_ALIASES.find((aliases) => aliases.includes(value)) ?? null;
}

function isRemoteSearch(value: string): boolean {
  return REMOTE_TERMS.some((term) => value === term);
}

/**
 * Enforces the user's requested location after third-party APIs respond.
 * Providers often use location as a ranking hint, so their raw results cannot
 * be trusted to stay inside the requested city or region.
 */
export function matchesSearchLocation(
  jobLocation: string | null | undefined,
  requestedLocation: string,
  workMode?: string | null
): boolean {
  const normalizedJob = normalizeLocation(jobLocation ?? "");
  const requestedParts = splitLocation(requestedLocation);

  if (!normalizedJob || requestedParts.length === 0) return false;

  const requestedPrimary = requestedParts[0];

  if (isRemoteSearch(requestedPrimary)) {
    return workMode === "remote" || containsAny(normalizedJob, REMOTE_TERMS);
  }

  if (requestedPrimary === "canada" || requestedPrimary === "canadian") {
    return (
      containsPhrase(normalizedJob, "canada") ||
      containsAny(normalizedJob, CANADIAN_REGION_TERMS)
    );
  }

  const requestedPrimaryRegion = getCanadianRegionTerms(requestedPrimary);
  if (requestedPrimaryRegion) {
    if (!containsAny(normalizedJob, requestedPrimaryRegion)) return false;

    const jobParts = splitLocation(jobLocation ?? "");
    const locationLooksLikeRegionName = requestedPrimaryRegion.includes(jobParts[0]);

    // Distinguish the province from same-named cities such as Ontario, CA.
    if (locationLooksLikeRegionName && jobParts.length > 1) {
      return (
        containsPhrase(normalizedJob, "canada") ||
        containsAny(jobParts.slice(1).join(" "), requestedPrimaryRegion) ||
        containsAny(jobParts.slice(1).join(" "), REMOTE_TERMS)
      );
    }

    return true;
  }

  const requestedCityTerms =
    requestedPrimary === "gta" || requestedPrimary === "greater toronto area"
      ? ["gta", "greater toronto area", "toronto metropolitan area", "toronto"]
      : [requestedPrimary];

  if (!containsAny(normalizedJob, requestedCityTerms)) return false;

  const requestedRegionPart = requestedParts[1];
  if (!requestedRegionPart) return true;

  const requestedCanadianRegion = getCanadianRegionTerms(requestedRegionPart);
  const requestedRegionTerms = requestedCanadianRegion ?? [requestedRegionPart];

  if (containsAny(normalizedJob, requestedRegionTerms)) return true;

  if (requestedCanadianRegion && containsPhrase(normalizedJob, "canada")) return true;

  const jobParts = splitLocation(jobLocation ?? "");

  // City-only strings such as "Toronto" are allowed because there is no
  // conflicting qualifier. Explicit mismatches such as "London, UK" are not.
  if (jobParts.length === 1) return true;

  return containsAny(jobParts.slice(1).join(" "), REMOTE_TERMS);
}

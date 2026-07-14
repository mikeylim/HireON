import axios from "axios";
import {
  GEMINI_REQUEST_TIMEOUT_MS,
  getGeminiGenerateContentUrl,
  getGeminiGenerationDefaults,
} from "@/lib/gemini/config";

// What we extract from a job posting URL — every field is nullable so Gemini
// can return null when uncertain instead of hallucinating
export interface ParsedJob {
  title: string | null;
  company: string | null;
  location: string | null;
  description: string | null;
  job_type: "full-time" | "part-time" | "contract" | "internship" | "temporary" | null;
  work_mode: "onsite" | "remote" | "hybrid" | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: "annual" | "monthly" | "hourly" | null;
  deadline: string | null;       // YYYY-MM-DD
  duration_value: number | null; // for contracts/internships
  duration_unit: "months" | "years" | null;
  notes: string | null;          // application tips, required docs, contact info, etc.
}

interface GeminiProviderError {
  error?: {
    status?: string;
    message?: string;
  };
}

export class GeminiRequestError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "GeminiRequestError";
  }
}

function mapGeminiRequestError(err: unknown): GeminiRequestError {
  if (!axios.isAxiosError<GeminiProviderError>(err)) {
    console.error("[gemini:parse] unexpected failure:", err instanceof Error ? err.message : err);
    return new GeminiRequestError("AI parsing failed unexpectedly. Please try again.", 500);
  }

  const httpStatus = err.response?.status;
  const providerStatus = err.response?.data?.error?.status;
  const providerMessage = err.response?.data?.error?.message
    ?.replace(/AIza[\w-]+/g, "[redacted]")
    .slice(0, 300);

  // Log only diagnostic metadata. Never log the Axios request config because
  // its headers contain the Gemini API key and its body contains posting text.
  console.error("[gemini:parse] request failed", {
    httpStatus,
    axiosCode: err.code,
    providerStatus,
    providerMessage,
  });

  if (
    err.code === "ECONNABORTED" ||
    err.code === "ETIMEDOUT" ||
    /timeout/i.test(err.message)
  ) {
    return new GeminiRequestError(
      "Gemini took too long to respond. Please try again with a shorter job description.",
      504
    );
  }

  if (httpStatus === 400) {
    if (/api key/i.test(providerMessage ?? "")) {
      return new GeminiRequestError(
        "Gemini rejected the API key. Check GEMINI_API_KEY and restart the server.",
        502
      );
    }
    return new GeminiRequestError(
      "Gemini rejected the request configuration. Check the selected model and generation settings.",
      502
    );
  }

  if (httpStatus === 401 || httpStatus === 403) {
    return new GeminiRequestError(
      "Gemini API access was denied. Check the API key restrictions and Google project access.",
      502
    );
  }

  if (httpStatus === 404) {
    return new GeminiRequestError(
      "Gemini model not found. Check GEMINI_MODEL.",
      502
    );
  }

  if (httpStatus === 429) {
    return new GeminiRequestError(
      "Gemini rate limit or quota was reached. Try again later.",
      429
    );
  }

  if (httpStatus && httpStatus >= 500) {
    return new GeminiRequestError(
      "Gemini is temporarily unavailable. Please try again shortly.",
      503
    );
  }

  return new GeminiRequestError(
    "Couldn't connect to Gemini. Check your network and try again.",
    502
  );
}

// Send page content to Gemini and get structured job fields back
export async function parseJobFromContent(
  pageContent: string,
  sourceUrl: string
): Promise<ParsedJob> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const geminiUrl = getGeminiGenerateContentUrl();
  const generationDefaults = getGeminiGenerationDefaults();

  // Truncate to keep within token budget. 12000 chars (~3000 tokens) gives
  // enough room to capture metadata that often appears below the main description
  // (salary, deadline, application instructions) on corporate career sites.
  const trimmed = pageContent.substring(0, 12000);

  // The prompt design is the most important part of preventing hallucinations:
  // use a strict schema, explicit null instructions, and minimal model thinking.
  const prompt = `You are a job posting parser. Extract structured information from the job posting content below.

CRITICAL RULES — read carefully:
1. Return ONLY valid JSON. No markdown, no commentary, no code fences.
2. If you cannot CONFIDENTLY determine a field from the content, set it to null.
3. NEVER guess. NEVER make up data. Better to return null than to be wrong.
4. Description must be a 2-3 sentence summary in your own words, max 300 characters.
5. For salary: scan the ENTIRE content for any pay information. Look for labels like
   "Salary:", "Pay:", "Compensation:", "Pay range:", "$X - $Y", "$X/hr", etc.
   Parse the original numbers. salary_min and salary_max should be the lower and
   upper bounds. salary_period: "hourly" for $/hr, "monthly" for $/mo, otherwise "annual".
6. For deadline: scan for labels like "Application Deadline:", "Apply by:",
   "Closes:", "Closing date:". Convert dates like "05/24/2026" or "May 24, 2026"
   to YYYY-MM-DD format. If only month/day given, assume current year.
7. For job_type, look for "full-time", "part-time", "intern", "contract", "co-op".
   Co-op counts as "internship".
8. For work_mode: "remote" if fully remote, "hybrid" if mixed, "onsite" if in-person.
9. For duration_value/unit: scan for "X-month", "X month", "X year" in the title
   or content. Only set for contract/internship/temporary roles.
10. For notes: extract APPLICATION-RELATED helpful info only (not the job description).
    Examples: required documents ("Please submit transcripts"), referral program
    mentions, application instructions ("Apply through Workday only"), contact
    person, special requirements (work permit, security clearance), recruiter name.
    Keep notes concise — bullet points or short lines. Max 400 chars.
    Return null if no application-specific info is found.

Schema (return JSON in EXACTLY this structure):
{
  "title": string | null,
  "company": string | null,
  "location": string | null,
  "description": string | null,
  "job_type": "full-time" | "part-time" | "contract" | "internship" | "temporary" | null,
  "work_mode": "onsite" | "remote" | "hybrid" | null,
  "salary_min": number | null,
  "salary_max": number | null,
  "salary_period": "annual" | "monthly" | "hourly" | null,
  "deadline": string | null,
  "duration_value": number | null,
  "duration_unit": "months" | "years" | null,
  "notes": string | null
}

Source URL: ${sourceUrl}

Page content:
${trimmed}`;

  let data;
  try {
    const response = await axios.post(
      geminiUrl,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          ...generationDefaults,
          maxOutputTokens: 4096, // generous budget for thinking models that reserve tokens
          responseMimeType: "application/json",
        },
      },
      {
        headers: { "x-goog-api-key": apiKey },
        timeout: GEMINI_REQUEST_TIMEOUT_MS,
      }
    );
    data = response.data;
  } catch (err) {
    throw mapGeminiRequestError(err);
  }

  const candidate = data?.candidates?.[0];
  const text: string = candidate?.content?.parts?.[0]?.text ?? "{}";
  const finishReason: string | undefined = candidate?.finishReason;

  // Strip markdown fences just in case (defensive — responseMimeType should prevent this)
  const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

  let parsed: ParsedJob;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Log everything we know so the developer can diagnose root cause
    console.error("[parse-url] Gemini returned invalid JSON.");
    console.error("[parse-url] finishReason:", finishReason);
    console.error("[parse-url] raw text length:", text.length);
    console.error("[parse-url] raw text (first 500):", text.substring(0, 500));
    console.error("[parse-url] raw text (last 500):", text.substring(Math.max(0, text.length - 500)));

    // Specific message for the most common failure: output truncated mid-JSON
    if (finishReason === "MAX_TOKENS") {
      throw new Error(
        "AI response was cut off — content was too long. Try pasting a shorter description with only the essentials."
      );
    }
    throw new Error("AI returned an unexpected response. Please try again or fill the form manually.");
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Description + Notes enhancement
//
// Adapters (Workday, Greenhouse, JSON-LD, etc.) extract structured fields but
// the raw `description` they return is often unstructured prose mixed with
// marketing fluff, eligibility criteria, application instructions, etc.
//
// This helper takes the raw description text and asks Gemini to split it into:
//   - description: WHAT THE ROLE INVOLVES (responsibilities, duties)
//   - notes:       APPLICATION-PROCESS info (eligibility, required docs, etc.)
//
// Called as a post-processing step after any adapter succeeds.
// ─────────────────────────────────────────────────────────────────────────────

export interface EnhancedFields {
  description: string | null;
  notes: string | null;
}

export async function enhanceDescriptionAndNotes(
  rawText: string
): Promise<EnhancedFields> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { description: null, notes: null };

  // Decode entities, strip HTML tags, collapse whitespace
  const cleaned = rawText
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 100) {
    // Too little text to meaningfully extract anything
    return { description: cleaned || null, notes: null };
  }

  // Truncate to keep cost down — most postings fit
  const trimmed = cleaned.substring(0, 8000);

  const prompt = `You are given the raw text of a job posting description.
Extract TWO independent pieces:

1. "description" — a CONCISE summary of WHAT THE ROLE INVOLVES:
   the actual duties, responsibilities, and what the candidate will do day-to-day.
   - Look for sections like "Responsibilities", "What will you do?", "Your role", etc.
   - Use bullet points if the source uses them (with "• " prefix on each).
   - Skip company marketing/background ("Acme is a leading...").
   - Skip required skills/qualifications (those go elsewhere).
   - Skip application instructions.
   - Max 600 characters.

2. "notes" — APPLICATION-PROCESS info that helps the applicant prepare:
   - Eligibility requirements ("must be returning student", "Canadian citizen only")
   - Required documents ("submit transcripts", "include cover letter")
   - Special instructions ("apply through Workday only", "contact the recruiter")
   - Contact info (recruiter name, email)
   - Posting IDs / Requisition IDs
   - Anything procedural that's NOT part of the actual job duties
   - Max 500 characters.
   - Return null if no such info is found.

CRITICAL:
- Return ONLY valid JSON in this exact shape:
  { "description": string | null, "notes": string | null }
- No markdown. No code fences. No commentary.
- Extract what's actually in the source. Do not paraphrase aggressively or invent details.
- If you can't confidently extract a field, set it to null.

Raw text:
  ${trimmed}`;

  try {
    const geminiUrl = getGeminiGenerateContentUrl();
    const generationDefaults = getGeminiGenerationDefaults();
    const response = await axios.post(
      geminiUrl,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          ...generationDefaults,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
        },
      },
      {
        headers: { "x-goog-api-key": apiKey },
        timeout: GEMINI_REQUEST_TIMEOUT_MS,
      }
    );

    const text: string = response.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const stripped = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(stripped);

    return {
      description: typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : null,
      notes: typeof parsed.notes === "string" && parsed.notes.trim()
        ? parsed.notes.trim()
        : null,
    };
  } catch (err) {
    // Enhancement is best-effort — if Gemini fails, return nulls and let the
    // adapter's original description stand
    const mappedError = mapGeminiRequestError(err);
    console.error("[enhanceDescriptionAndNotes] failed:", mappedError.message);
    return { description: null, notes: null };
  }
}

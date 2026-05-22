import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import { getAuthUser } from "@/lib/supabase/auth";
import { parseJobFromContent, enhanceDescriptionAndNotes } from "@/lib/gemini/parse-url";
import { tryAdapters } from "@/lib/ats";

// Description length cap stored in DB after Gemini enhancement (or as a fallback
// when enhancement returns nothing). Long enough for the modal display.
const DESCRIPTION_MAX = 600;
const NOTES_MAX = 500;

// Sites known to block server-side scraping — we'll warn the user about these
const HARD_TO_PARSE_DOMAINS = [
  "linkedin.com",
  "indeed.com",
  "indeed.ca",
  "glassdoor.com",
  "glassdoor.ca",
];

// POST /api/jobs/parse-url
// Body: { url: string } OR { text: string }
// - url: fetch and scrape the URL, then send content to Gemini
// - text: send the pasted text directly to Gemini (skips fetching)
// Returns extracted job fields, or an error message
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to use AI auto-fill." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { url, text } = body;

    // ── Branch 1: User pasted job description text directly ──
    // This bypasses the JS-rendering problem entirely since we don't need to fetch.
    if (text && typeof text === "string" && text.trim().length > 0) {
      // Normalize whitespace — pasted text often has lots of blank lines
      // and inconsistent spacing that wastes tokens and dilutes the signal.
      // Same treatment we apply to scraped HTML in the URL branch.
      const cleanedText = text.replace(/\s+/g, " ").trim();

      if (cleanedText.length < 100) {
        return NextResponse.json(
          { error: "Description is too short. Paste more details for accurate extraction." },
          { status: 400 }
        );
      }

      try {
        const parsed = await parseJobFromContent(cleanedText, "(pasted text)");
        console.log("[parse-url] Gemini extracted from pasted text:", JSON.stringify(parsed, null, 2));

        const allNull = Object.values(parsed).every((v) => v === null);
        if (allNull) {
          return NextResponse.json(
            { error: "Couldn't extract any job details from the pasted text. Make sure it's a job posting description." },
            { status: 400 }
          );
        }

        return NextResponse.json({ data: parsed, warning: null });
      } catch (err) {
        const message = err instanceof Error ? err.message : "AI parsing failed";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    // ── Branch 2: User provided a URL — fetch + scrape + parse ──
    // Basic URL validation
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL or text is required." }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format." }, { status: 400 });
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        { error: "URL must use http:// or https://" },
        { status: 400 }
      );
    }

    // Warn (but still try) for known-difficult sites
    const hostname = parsedUrl.hostname.toLowerCase();
    const isHardToParse = HARD_TO_PARSE_DOMAINS.some((d) => hostname.includes(d));

    // ── Branch 2a: Try platform-specific ATS adapters first ──
    // We try Workday → JSON-LD (universal) in sequence. If any succeeds with
    // real data, we use it and skip the whole scraping + Gemini pipeline.
    // Much more reliable than scraping JS-rendered pages.
    const adapterResult = await tryAdapters(parsedUrl);
    if (adapterResult) {
      const parsed = adapterResult.data;

      // Fill in company from hostname if the adapter didn't set it
      if (!parsed.company) {
        const hostParts = hostname.split(".");
        const guessedCompany = hostParts[hostParts.length - 2];
        if (guessedCompany) {
          parsed.company = guessedCompany.charAt(0).toUpperCase() + guessedCompany.slice(1);
        }
      }

      // Enhance description + notes with Gemini.
      // Adapters give us the raw description text; Gemini splits it into
      // "what the role involves" (description) and "application-process info" (notes).
      // Only worth running when the source has enough text — short blurbs
      // are usually already focused or have no structure to extract from.
      if (parsed.description && parsed.description.length >= 500) {
        const enhanced = await enhanceDescriptionAndNotes(parsed.description);
        if (enhanced.description) {
          parsed.description = enhanced.description.substring(0, DESCRIPTION_MAX);
        } else {
          // Fallback: cap the adapter's raw description to a reasonable length
          parsed.description = parsed.description.substring(0, DESCRIPTION_MAX);
        }
        if (enhanced.notes) {
          parsed.notes = enhanced.notes.substring(0, NOTES_MAX);
        }
      } else if (parsed.description) {
        // Short description — keep as-is, just cap defensively
        parsed.description = parsed.description.substring(0, DESCRIPTION_MAX);
      }

      console.log(
        `[parse-url] ${adapterResult.adapterName} adapter succeeded:`,
        JSON.stringify(parsed, null, 2)
      );
      return NextResponse.json({ data: parsed, warning: null });
    }
    console.log(`[parse-url] No adapter succeeded for ${url}, falling back to scraping`);

    // ── Branch 2b: Standard HTML fetch + Cheerio + Gemini ──
    // Fetch the HTML — polite User-Agent, reasonable timeout
    let html: string;
    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: 15000,
        maxRedirects: 5,
        // Don't throw on 4xx — we'll handle the response ourselves
        validateStatus: (status) => status < 500,
      });

      if (response.status >= 400) {
        return NextResponse.json(
          {
            error: isHardToParse
              ? "This site blocks automated access. Try copying the description manually or use a different URL."
              : `Couldn't fetch the page (status ${response.status}). Make sure the URL is publicly accessible.`,
          },
          { status: 400 }
        );
      }

      html = response.data;
    } catch (err) {
      console.error("Fetch failed:", err);
      return NextResponse.json(
        {
          error: isHardToParse
            ? "This site blocks automated access. Best results come from company career pages."
            : "Couldn't reach this URL. Check that the link is correct and publicly accessible.",
        },
        { status: 400 }
      );
    }

    // Extract content with Cheerio. We strip ONLY truly noisy elements
    // (scripts, styles, iframes) and trust Gemini to filter the rest.
    // Being too aggressive here (removing aside/sidebar) loses critical info like
    // salary and deadline that corporate career sites often put in sidebars.
    const $ = cheerio.load(html);
    $("script, style, iframe, noscript, svg").remove();

    // Grab the full body text — let the LLM decide what's job-related
    const mainContent = $("body").text();

    // Collapse whitespace
    const cleaned = mainContent.replace(/\s+/g, " ").trim();

    // Quick debug: does the page text contain salary/deadline hints?
    const hasSalary = /\$[\d,]+|salary|compensation|pay range/i.test(cleaned);
    const hasDeadline = /deadline|apply by|closing date|closes:/i.test(cleaned);
    console.log(`[parse-url] Page text: ${cleaned.length} chars, hasSalary=${hasSalary}, hasDeadline=${hasDeadline}`);

    if (cleaned.length < 100) {
      return NextResponse.json(
        {
          error:
            "Couldn't find enough content on this page. It might be JavaScript-rendered or require login.",
        },
        { status: 400 }
      );
    }

    // Send to Gemini for structured extraction
    let parsed;
    try {
      parsed = await parseJobFromContent(cleaned, url);
      console.log("[parse-url] Gemini extracted:", JSON.stringify(parsed, null, 2));
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI parsing failed";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    // Quick sanity check — if every field is null, the parse essentially failed
    const allNull = Object.values(parsed).every((v) => v === null);
    if (allNull) {
      return NextResponse.json(
        {
          error:
            "Couldn't extract any job details from this page. Try a different URL or fill the form manually.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      data: parsed,
      warning: isHardToParse
        ? "This site is known to block scrapers — some fields may be incomplete. Please review carefully."
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Parse URL error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

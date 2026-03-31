import axios from "axios";

// Sends a batch of jobs to Gemini and gets back relevance scores (0-100).
// We batch them into a single prompt to minimize API calls.

interface JobForScoring {
  title: string;
  company: string;
  location: string;
  description: string;
  salary_min: number | null;
  salary_max: number | null;
}

interface ScoredResult {
  index: number;
  score: number;
  reason: string;
}

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export async function scoreJobs(
  jobs: JobForScoring[],
  userContext: string // e.g. "junior developer looking for full-stack or frontend roles in Toronto"
): Promise<ScoredResult[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY missing");
    return jobs.map((_, i) => ({ index: i, score: 50, reason: "Scoring unavailable" }));
  }

  // Build a compact job list for the prompt — keep tokens down
  const jobList = jobs
    .map(
      (j, i) =>
        `[${i}] "${j.title}" at ${j.company} — ${j.location}${
          j.salary_min ? ` — $${j.salary_min}` : ""
        }${j.salary_max ? `-$${j.salary_max}` : ""}${
          j.description ? `\n    ${j.description.substring(0, 200)}` : ""
        }`
    )
    .join("\n");

  const prompt = `You are a job relevance scoring assistant. The user is: ${userContext}

Score each job from 0-100 based on how relevant it is to this person. Consider:
- Job title match to their skills/goals
- Location preference (Toronto/GTA/Ontario/Remote is good)
- Salary competitiveness
- Company reputation if recognizable
- Whether the role level matches (junior vs senior, etc.)

Jobs to score:
${jobList}

Respond ONLY with valid JSON array, no markdown, no explanation:
[{"index": 0, "score": 75, "reason": "Good title match, decent salary"}, ...]

Every job must have an entry. Keep reasons under 15 words.`;

  try {
    const { data } = await axios.post(
      `${GEMINI_URL}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // low randomness for consistent scoring
          maxOutputTokens: 4096,
        },
      },
      { timeout: 30000 }
    );

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";

    // Gemini sometimes wraps JSON in markdown code blocks — strip that
    const cleaned = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed: ScoredResult[] = JSON.parse(cleaned);

    return parsed;
  } catch (err) {
    console.error("Gemini scoring failed:", err instanceof Error ? err.message : err);
    // Fallback: give everything a neutral 50 so the UI still works
    return jobs.map((_, i) => ({ index: i, score: 50, reason: "Scoring failed" }));
  }
}

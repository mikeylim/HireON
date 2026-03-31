import { NextRequest, NextResponse } from "next/server";
import { scoreJobs } from "@/lib/gemini/score";

// POST /api/score
// Takes an array of preview jobs + user context, returns them with relevance scores.
// This runs Gemini in the background while the user is looking at the preview.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const jobs: Array<{
      title: string;
      company: string;
      location: string;
      description: string;
      salary_min: number | null;
      salary_max: number | null;
    }> = body.jobs ?? [];
    const userContext: string =
      body.userContext ?? "job seeker looking for roles in Ontario/Toronto";

    if (jobs.length === 0) {
      return NextResponse.json({ scores: [], error: null });
    }

    // Gemini has a context limit — score in batches of 20 to stay safe
    const BATCH_SIZE = 20;
    const allScores: Array<{ index: number; score: number; reason: string }> = [];

    for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
      const batch = jobs.slice(i, i + BATCH_SIZE);
      const results = await scoreJobs(batch, userContext);

      // Remap batch-local indexes back to the full list indexes
      results.forEach((r) => {
        allScores.push({
          index: i + r.index,
          score: r.score,
          reason: r.reason,
        });
      });
    }

    return NextResponse.json({ scores: allScores, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Score error:", message);
    return NextResponse.json(
      { scores: [], error: message },
      { status: 500 }
    );
  }
}

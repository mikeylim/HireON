import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

// POST /api/jobs/check
// Body: { urls: string[] }
// Returns which URLs already exist in the database
// Guests get an empty result (they have no saved jobs)
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ existing: [] });

    const { urls } = await req.json();

    if (!urls || urls.length === 0) {
      return NextResponse.json({ existing: [] });
    }

    const supabase = await createServerSupabase();
    const { data } = await supabase
      .from("jobs")
      .select("url")
      .in("url", urls);

    const existing = (data ?? []).map((row: { url: string }) => row.url);

    return NextResponse.json({ existing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ existing: [], error: message }, { status: 500 });
  }
}

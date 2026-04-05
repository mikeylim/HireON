import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

// POST /api/jobs/add
// Adds a single manually-entered job, tied to the current user
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const job = await req.json();

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("jobs")
      .upsert(
        { ...job, user_id: user.id },
        { onConflict: "url", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

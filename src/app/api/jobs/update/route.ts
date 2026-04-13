import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

// PATCH /api/jobs/update
// Body: { id: string, updates } for single, or { ids: string[], updates } for bulk
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { id, ids, updates } = body;
    const targetIds: string[] = ids ?? (id ? [id] : []);

    if (targetIds.length === 0) {
      return NextResponse.json(
        { error: "At least one job ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const query = supabase.from("jobs").update(updates).in("id", targetIds).select();
    // For single-job updates, return just the one row to keep backward compatibility
    const { data, error } = targetIds.length === 1
      ? await query.single()
      : await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

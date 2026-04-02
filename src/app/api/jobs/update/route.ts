import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// PATCH /api/jobs/update
// Body: { id: string, updates: { status?, notes?, ... } }
// Updates any fields on a single job row
export async function PATCH(req: NextRequest) {
  try {
    const { id, updates } = await req.json();

    if (!id) {
      return NextResponse.json(
        { error: "Job ID is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("jobs")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

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

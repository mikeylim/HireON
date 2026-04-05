import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/supabase/auth";

// DELETE /api/jobs/delete
// Body: { ids: string[] }
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { ids } = await req.json();

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "At least one job ID is required." },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const { error } = await supabase
      .from("jobs")
      .delete()
      .in("id", ids);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      error: null,
      message: `Deleted ${ids.length} job${ids.length !== 1 ? "s" : ""}.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

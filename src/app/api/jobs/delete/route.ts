import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/client";

// DELETE /api/jobs/delete
// Body: { ids: string[] }
// Deletes one or more jobs permanently
export async function DELETE(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!ids || ids.length === 0) {
      return NextResponse.json(
        { error: "At least one job ID is required." },
        { status: 400 }
      );
    }

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

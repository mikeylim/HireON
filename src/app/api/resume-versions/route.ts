import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth";
import { createServerSupabase } from "@/lib/supabase/server";

const MAX_RESUME_VERSION_LENGTH = 80;

function normalizeResumeVersionName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > MAX_RESUME_VERSION_LENGTH) return null;

  return name;
}

function normalizeKey(name: string): string {
  return name.toLocaleLowerCase();
}

// GET /api/resume-versions
// Returns reusable resume-version names for the signed-in user.
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("resume_versions")
      .select("id, name, created_at, updated_at")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/resume-versions
// Body: { name: string }
// Creates or updates a reusable resume-version name for the signed-in user.
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const name = normalizeResumeVersionName(body.name);
    if (!name) {
      return NextResponse.json(
        { error: `Resume version is required and must be ${MAX_RESUME_VERSION_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("resume_versions")
      .upsert(
        {
          user_id: user.id,
          name,
          normalized_name: normalizeKey(name),
        },
        { onConflict: "user_id,normalized_name", ignoreDuplicates: false }
      )
      .select("id, name, created_at, updated_at")
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

// DELETE /api/resume-versions
// Body: { id: string }
// Deletes a reusable dropdown option. Historical job records are intentionally unchanged.
export async function DELETE(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) {
      return NextResponse.json({ error: "Resume version ID is required." }, { status: 400 });
    }

    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("resume_versions")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ error: "Resume version not found." }, { status: 404 });
    }

    return NextResponse.json({ data: data[0], error: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

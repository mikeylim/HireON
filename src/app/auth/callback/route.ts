import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

// GET /auth/callback — handles the OAuth redirect from Google/email magic link
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  // If something went wrong, send them back to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

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
      // Clear guest cookie now that the user is properly signed in
      const response = NextResponse.redirect(`${origin}/dashboard`);
      response.cookies.set("hireon-guest", "", { path: "/", maxAge: 0 });
      return response;
    }
  }

  // If something went wrong, send them back to login
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client that includes auth cookies in requests.
// Use this in "use client" components — it lets RLS see the logged-in user.
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

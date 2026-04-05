import { createServerSupabase } from "./server";

// Checks if the current request has a valid auth session.
// Returns the user if authenticated, null if not.
// Use this at the top of any API route that needs protection.
export async function getAuthUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

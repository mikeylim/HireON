import { createClient } from "@supabase/supabase-js";

// Grab Supabase credentials from env — these are safe to expose client-side
// (RLS policies on Supabase handle the actual security)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

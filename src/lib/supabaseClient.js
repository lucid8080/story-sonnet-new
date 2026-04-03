import { createClient } from '@supabase/supabase-js';

// Supabase client singleton for the frontend.
// Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your env.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // We log a warning instead of throwing so the app can still run
  // in purely-static mode while Supabase is not configured.
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing. Auth and dynamic content will be disabled.'
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;


/**
 * Module-level Supabase client for use inside `unstable_cache` functions.
 *
 * Unlike the cookie-based createClient(), this client is instantiated once at
 * module load time and does NOT depend on per-request cookies or headers.
 * That makes it safe to use inside Next.js `unstable_cache`, which executes
 * the cached function in a context that may not have access to the current
 * HTTP request.
 *
 * Security model:
 * - If SUPABASE_SERVICE_ROLE_KEY is set  → bypasses RLS (fine for internal CMS)
 * - If only NEXT_PUBLIC_SUPABASE_ANON_KEY is set → RLS applies (read-only access
 *   may fail if policies require auth; service key is strongly recommended)
 *
 * Auth is ALWAYS checked separately in the page/route component using the
 * standard cookie-based createClient() before any cached data is returned.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey  =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const cacheDb = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession:   false,
    autoRefreshToken: false,
  },
});

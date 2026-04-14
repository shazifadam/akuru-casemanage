import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service-role key.
 * Only ever used in server-side code (Server Actions / Route Handlers).
 * Bypasses RLS — handle with care.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local — " +
        "find it in Supabase Dashboard → Project Settings → API → service_role key."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

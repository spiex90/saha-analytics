import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. Bypasses RLS.
 * NEVER expose to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "analytics" },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

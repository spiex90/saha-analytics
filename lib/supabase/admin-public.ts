import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client pointed at the PUBLIC schema (SAHA's data).
 * Used by sync-saha to read platform_profiles and creators.
 * NEVER expose to the browser.
 */
export function createPublicAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: "public" },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role client. Bypasses RLS.
 *
 * ONLY use this for operations that:
 *  - must read/write across rows a normal user could not (e.g. resolving a QR
 *    token to a session before the caller is known to belong to that class), or
 *  - must be atomic and centrally validated (e.g. inserting an attendance record
 *    after every check below has passed).
 *
 * Every write made with this client MUST re-derive identity from the
 * authenticated user (see lib/auth.ts) rather than trusting request body fields.
 * NEVER import this file from a Client Component or expose it to the browser.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Missing Supabase service role configuration");
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

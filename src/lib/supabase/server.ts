import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

/**
 * Anon client for public data (catalog, reviews, ratings) and the anon-callable
 * booking RPC. Never touches request cookies, so pages that use it stay
 * eligible for static generation / ISR.
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/**
 * Service-role client — bypasses RLS. Server-only, never expose to the client.
 * Used to read a single appointment (which carries the guest's contact details)
 * and to record payment outcomes.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type Client = SupabaseClient<Database>;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(URL && ANON_KEY);

// Neither client keeps a session or reads cookies: there is no sign-in, and a
// request-independent client keeps the pages that use it static / ISR-able.
const options = { auth: { persistSession: false, autoRefreshToken: false } } as const;

let publicClient: Client | undefined;
let adminClient: Client | undefined;

/**
 * The public (anon / publishable) key. Can only do what the database's grants
 * and RLS allow the `anon` role: read the public catalog, the staff and the
 * rating views. It cannot call the booking functions or touch appointments.
 *
 * Callers check `isSupabaseConfigured` first (a build without env vars then
 * renders the empty-catalog fallbacks); there is no placeholder client, so a
 * missing variable in production fails loudly instead of querying a fake host.
 */
export function createPublicClient(): Client {
  if (!URL || !ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.");
  }
  return (publicClient ??= createClient<Database>(URL, ANON_KEY, options));
}

/**
 * The secret (service_role) key — bypasses RLS. Server-only (this module cannot
 * be imported from client code). Use it for everything private: the booking
 * functions (which the public key cannot call), reading and updating
 * appointments (guest PII), and recording payment outcomes.
 */
export function createAdminClient(): Client {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!URL || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) must be set to use the server client.");
  }
  return (adminClient ??= createClient<Database>(URL, key, options));
}

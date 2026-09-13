import { createClient } from "@supabase/supabase-js";

// Same shape as src/lib/supabase/server.ts#createAdminClient — service-role,
// bypasses RLS. Node-side only (Playwright test process), never sent to the
// browser under test.
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY must be set in .env.local to run tests that create bookings.",
    );
  }
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/**
 * Delete exactly the appointment(s) a test created, by id — never a pattern
 * match. Safe to call even if the id was never created (no-op) or was
 * already removed by the app itself.
 */
export async function deleteTestAppointment(...ids: (string | null | undefined)[]) {
  const real = ids.filter((id): id is string => !!id);
  if (real.length === 0) return;
  const { error } = await adminClient().from("appointments").delete().in("id", real);
  if (error) {
    // Don't fail the test suite over cleanup — surface it loudly instead.
    console.error(`[cleanup] failed to delete appointments ${real.join(", ")}:`, error.message);
  }
}

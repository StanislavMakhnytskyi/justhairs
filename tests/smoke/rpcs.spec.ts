import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Independent of the UI: checks what the PUBLIC key can and cannot do against
// the deployed database. Uses the anon key only — no writes, no service-role
// key. (The full rule set runs offline in `npm run test:db`; this confirms the
// live project actually has migration 0007 applied.)
test.describe("what the public key can reach", () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = () => createClient(url!, anonKey!, { auth: { persistSession: false } });

  test.beforeEach(() => {
    test.skip(
      !url || !anonKey,
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set in .env.local",
    );
  });

  test("the public catalog and rating views are readable", async () => {
    const db = supabase();
    const { data: service, error } = await db.from("services").select("id").eq("active", true).limit(1).single();
    expect(error, "reading the public catalog").toBeNull();
    expect(service).toBeTruthy();

    for (const view of ["service_ratings", "staff_ratings", "public_reviews"] as const) {
      const { error: e } = await db.from(view).select("*").limit(1);
      expect(e, view).toBeNull();
    }
  });

  test("the booking functions are server-only (migration 0007)", async () => {
    const db = supabase();
    const { error: slotsErr } = await db.rpc("get_available_slots", {
      p_service_id: "00000000-0000-0000-0000-000000000000",
      p_staff_id: null,
      p_day: new Date().toISOString().slice(0, 10),
    });
    expect(slotsErr?.message ?? "", "get_available_slots must not be callable with the public key").toMatch(/permission denied/i);

    const { error: bookErr } = await db.rpc("book_appointment", {
      p_service_id: "00000000-0000-0000-0000-000000000000",
      p_staff_id: null,
      p_starts_at: new Date(Date.now() + 2 * 864e5).toISOString(),
    });
    expect(bookErr?.message ?? "", "book_appointment must not be callable with the public key").toMatch(/permission denied/i);
  });

  test("guest data is not reachable (migration 0007)", async () => {
    const db = supabase();
    const appts = await db.from("appointments").select("id").limit(1);
    expect(appts.error?.message ?? "", "appointments").toMatch(/permission denied/i);
    // appointment_id is the key to a guest's confirmation page
    const link = await db.from("reviews").select("appointment_id").limit(1);
    expect(link.error?.message ?? "", "reviews.appointment_id").toMatch(/permission denied/i);
    const off = await db.from("staff_time_off").select("reason").limit(1);
    expect(off.error?.message ?? "", "staff_time_off").toMatch(/permission denied/i);
  });
});

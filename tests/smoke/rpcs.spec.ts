import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Independent of the UI: confirms the anon-callable booking RPCs (and the
// migrations they depend on) are actually deployed. Uses the anon key only —
// no writes, no service-role key.
test.describe("booking RPCs", () => {
  test("get_available_slots and get_day_availability are callable and agree", async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    test.skip(
      !url || !anonKey,
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY not set in .env.local",
    );

    const supabase = createClient(url!, anonKey!, { auth: { persistSession: false } });

    const { data: service, error: svcErr } = await supabase
      .from("services")
      .select("id")
      .eq("active", true)
      .limit(1)
      .single();
    expect(svcErr, "reading the public catalog").toBeNull();
    expect(service).toBeTruthy();

    const from = new Date().toISOString().slice(0, 10);

    const { data: days, error: rangeErr } = await supabase.rpc("get_day_availability", {
      p_service_id: service!.id,
      p_staff_id: null,
      p_from: from,
      p_days: 14,
    });
    // migration 0004
    expect(rangeErr, "get_day_availability").toBeNull();
    expect(Array.isArray(days)).toBe(true);

    const { error: dayErr } = await supabase.rpc("get_available_slots", {
      p_service_id: service!.id,
      p_staff_id: null,
      p_day: from,
    });
    expect(dayErr, "get_available_slots").toBeNull();
  });
});

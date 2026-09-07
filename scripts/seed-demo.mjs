// Demo data for justhairs — past visits + reviews so the UI shows real content.
//
//   node --env-file=.env.local scripts/seed-demo.mjs
//
// Idempotent: removes the demo users (and their appointments/reviews via cascade)
// before recreating them. Uses the service-role key, so it bypasses RLS.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO = [
  { email: "demo@justhairs.test", name: "Demo Client" },
  { email: "john.smith@justhairs.test", name: "John Smith" },
  { email: "maria.g@justhairs.test", name: "Maria Gomez" },
  { email: "alex.k@justhairs.test", name: "Alex Kelly" },
  { email: "sara.b@justhairs.test", name: "Sara Byrne" },
];

const COMMENTS = [
  "Exactly what I asked for. Booking took seconds.",
  "Best fade I've had in Dublin. Will be back.",
  "Friendly, fast, and the colour came out perfect.",
  "Relaxed atmosphere and a great cut.",
  "On time, no fuss, lovely result.",
  "My stylist really listened. Very happy.",
  null,
  null,
];

async function findOrCreateUser(email, name) {
  // list is paginated; the demo set is tiny so page 1 is enough
  const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 });
  const existing = list?.users.find((u) => u.email === email);
  if (existing) {
    await supabase.auth.admin.deleteUser(existing.id);
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const { data: services } = await supabase
    .from("services")
    .select("id, slug, price_cents, duration_min");
  const { data: links } = await supabase
    .from("staff_services")
    .select("staff_id, service_id");
  if (!services?.length || !links?.length) {
    console.error("Run supabase/seed.sql first — no services/staff found.");
    process.exit(1);
  }
  const staffFor = (serviceId) =>
    links.filter((l) => l.service_id === serviceId).map((l) => l.staff_id);

  let appts = 0;
  let reviews = 0;

  for (const person of DEMO) {
    const uid = await findOrCreateUser(person.email, person.name);
    // profile row is created by the handle_new_user trigger

    const visitCount = 2 + Math.floor(Math.random() * 3); // 2–4 past visits
    for (let i = 0; i < visitCount; i++) {
      const service = services[Math.floor(Math.random() * services.length)];
      const candidates = staffFor(service.id);
      if (!candidates.length) continue;
      const staffId = candidates[Math.floor(Math.random() * candidates.length)];

      const daysAgo = 3 + Math.floor(Math.random() * 40);
      const start = new Date();
      start.setDate(start.getDate() - daysAgo);
      start.setHours(10 + (i % 6), 0, 0, 0);
      const end = new Date(start.getTime() + service.duration_min * 60_000);

      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({
          customer_id: uid,
          service_id: service.id,
          staff_id: staffId,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          status: "completed",
          price_cents: service.price_cents,
          created_by: uid,
        })
        .select("id")
        .single();
      if (error) {
        console.warn("appointment insert failed:", error.message);
        continue;
      }
      appts++;

      // Leave one of the demo account's visits unreviewed so the
      // "How was your visit?" prompt is always visible when signed in as demo.
      const leaveUnreviewed = person.email === "demo@justhairs.test" && i === visitCount - 1;

      if (!leaveUnreviewed && Math.random() < 0.8) {
        const rating = Math.random() < 0.75 ? 5 : 4;
        const comment = COMMENTS[Math.floor(Math.random() * COMMENTS.length)];
        const { error: rErr } = await supabase.from("reviews").insert({
          appointment_id: appt.id,
          customer_id: uid,
          service_id: service.id,
          staff_id: staffId,
          rating,
          comment,
        });
        if (!rErr) reviews++;
      }
    }
    console.log(`  ${person.name}: seeded`);
  }

  console.log(`\nDone — ${appts} past appointments, ${reviews} reviews.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

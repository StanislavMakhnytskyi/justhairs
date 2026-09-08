// Demo data for justhairs — past visits + reviews, plus realistic near-term
// bookings so the time picker shows reserved slots.
//
//   node --env-file=.env.local scripts/seed-demo.mjs
//
// No auth: appointments are guest rows tagged with a *@justhairs.test email.
// Idempotent — every run deletes those rows (reviews cascade) and recreates
// them. Uses the service-role key, so it bypasses RLS.

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

const SALON_TZ = "Europe/Dublin";
const OPEN_HOUR = 9;
const CLOSE_HOUR = 18;
const DEMO_EMAIL = "@justhairs.test";

const DEMO = [
  { email: "demo@justhairs.test", name: "Demo Client", phone: "+353 1 000 0001" },
  { email: "john.smith@justhairs.test", name: "John Smith", phone: "+353 1 000 0002" },
  { email: "maria.g@justhairs.test", name: "Maria Gomez", phone: "+353 1 000 0003" },
  { email: "alex.k@justhairs.test", name: "Alex Kelly", phone: "+353 1 000 0004" },
  { email: "sara.b@justhairs.test", name: "Sara Byrne", phone: "+353 1 000 0005" },
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

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** salon-local wall time (dayStr yyyy-MM-dd, minutes from midnight) -> Date */
function salonTime(dayStr, minutes) {
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  const guess = new Date(`${dayStr}T${hh}:${mm}:00Z`);
  const shown = new Date(
    guess.toLocaleString("sv-SE", { timeZone: SALON_TZ }).replace(" ", "T") + "Z",
  );
  return new Date(guess.getTime() + (guess.getTime() - shown.getTime()));
}

async function main() {
  const [{ data: services }, { data: links }, { data: staff }, { data: hours }] =
    await Promise.all([
      supabase.from("services").select("id, slug, price_cents, duration_min"),
      supabase.from("staff_services").select("staff_id, service_id"),
      supabase.from("staff").select("id, slug").eq("active", true),
      supabase.from("staff_working_hours").select("staff_id, weekday"),
    ]);
  if (!services?.length || !links?.length) {
    console.error("Run supabase/seed.sql (or sync-catalog.mjs) first.");
    process.exit(1);
  }

  const staffFor = (serviceId) =>
    links.filter((l) => l.service_id === serviceId).map((l) => l.staff_id);
  const servicesForStaff = (staffId) =>
    links
      .filter((l) => l.staff_id === staffId)
      .map((l) => services.find((s) => s.id === l.service_id))
      .filter(Boolean);
  const worksOn = (staffId, weekday) =>
    hours.some((h) => h.staff_id === staffId && h.weekday === weekday);

  // 1. Wipe previous demo rows (reviews cascade on appointment delete).
  await supabase.from("appointments").delete().like("customer_email", `%${DEMO_EMAIL}`);

  // 2. Past visits + reviews
  let past = 0;
  let reviews = 0;
  for (let p = 0; p < DEMO.length; p++) {
    const person = DEMO[p];
    const visitCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < visitCount; i++) {
      const service = rand(services);
      const candidates = staffFor(service.id);
      if (!candidates.length) continue;
      const staffId = rand(candidates);
      const start = new Date();
      start.setDate(start.getDate() - (3 + Math.floor(Math.random() * 40)));
      start.setHours(10 + (i % 6), 0, 0, 0);
      const end = new Date(start.getTime() + service.duration_min * 60_000);

      const { data: appt, error } = await supabase
        .from("appointments")
        .insert({
          customer_name: person.name,
          customer_email: person.email,
          customer_phone: person.phone,
          service_id: service.id,
          staff_id: staffId,
          starts_at: start.toISOString(),
          ends_at: end.toISOString(),
          status: "completed",
          price_cents: service.price_cents,
          payment_status: "paid",
        })
        .select("id")
        .single();
      if (error) continue;
      past++;

      const leaveUnreviewed =
        person.email === "demo@justhairs.test" && i === visitCount - 1;
      if (!leaveUnreviewed && Math.random() < 0.8) {
        const { error: rErr } = await supabase.from("reviews").insert({
          appointment_id: appt.id,
          service_id: service.id,
          staff_id: staffId,
          rating: Math.random() < 0.75 ? 5 : 4,
          comment: rand(COMMENTS),
        });
        if (!rErr) reviews++;
      }
    }
  }

  // 3. Near-term reservations — fill most of today/tomorrow, thin out later.
  const rows = [];
  const today = new Date();
  for (let d = 0; d < 14; d++) {
    const day = new Date(today);
    day.setDate(day.getDate() + d);
    const dayStr = day.toISOString().slice(0, 10);
    const weekday = day.getDay();
    const fill = d <= 1 ? 0.75 : d <= 6 ? 0.4 : 0.22;

    for (const s of staff) {
      if (!worksOn(s.id, weekday)) continue;
      const menu = servicesForStaff(s.id);
      if (!menu.length) continue;

      let cursor = OPEN_HOUR * 60;
      const endOfDay = CLOSE_HOUR * 60;
      while (cursor < endOfDay) {
        const service = rand(menu);
        const fits = cursor + service.duration_min <= endOfDay;
        const startAt = salonTime(dayStr, cursor);
        const inFuture = startAt.getTime() > Date.now() + 30 * 60_000;

        if (fits && inFuture && Math.random() < fill) {
          const person = rand(DEMO);
          rows.push({
            customer_name: person.name,
            customer_email: person.email,
            customer_phone: person.phone,
            service_id: service.id,
            staff_id: s.id,
            starts_at: startAt.toISOString(),
            ends_at: new Date(
              startAt.getTime() + service.duration_min * 60_000,
            ).toISOString(),
            status: "confirmed",
            price_cents: service.price_cents,
            payment_status: rand(["paid", "pay_later"]),
          });
          cursor += Math.ceil(service.duration_min / 30) * 30; // skip consumed slots
        } else {
          cursor += 30;
        }
      }
    }
  }

  let reserved = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from("appointments").insert(rows.slice(i, i + 100));
    if (error) console.warn("reservation batch failed:", error.message);
    else reserved += rows.slice(i, i + 100).length;
  }

  console.log(
    `Done — ${past} past appointments, ${reviews} reviews, ${reserved} upcoming reservations.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

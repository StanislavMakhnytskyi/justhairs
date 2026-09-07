// One-off: push the current catalog (staff, services images, links, hours) to
// the live DB without truncating appointments/reviews.
//   node --env-file=.env.local scripts/sync-catalog.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const CDN =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/assets`;

const SERVICE_SLUGS = [
  "mens-haircut", "mens-beard", "mens-haircut-beard", "mens-shaving", "mens-styling",
  "womens-haircut", "womens-coloring", "womens-highlights", "womens-blow-dry",
  "womens-styling", "womens-treatment",
];

const STAFF = [
  ["22222222-0000-0000-0000-000000000001", "Amara Lee", "amara-lee", "Senior Stylist", "Fifteen years behind the chair. Colour and precision cutting.", 3],
  ["22222222-0000-0000-0000-000000000002", "Devon Cole", "devon-cole", "Barber", "Classic barbering, fades and beard sculpting.", null],
  ["22222222-0000-0000-0000-000000000003", "Priya Shah", "priya-shah", "Stylist", "Blow-dries, styling and treatments. Great with curls.", 4],
  ["22222222-0000-0000-0000-000000000004", "Marco Ferreira", "marco-ferreira", "Barber", "Skin fades, hot-towel shaves and beard design.", null],
  ["22222222-0000-0000-0000-000000000005", "Yuki Tanaka", "yuki-tanaka", "Colour Specialist", "Balayage, corrective colour and bond treatments.", 2],
  ["22222222-0000-0000-0000-000000000006", "Nadia Hassan", "nadia-hassan", "Stylist", "Cuts, blow-dries and event styling.", 5],
  ["22222222-0000-0000-0000-000000000007", "Ben Carter", "ben-carter", "Barber", "Scissor work, classic cuts and beard trims.", null],
];

const LINKS = [
  ["devon-cole", "mens-haircut"], ["marco-ferreira", "mens-haircut"], ["ben-carter", "mens-haircut"],
  ["devon-cole", "mens-beard"], ["marco-ferreira", "mens-beard"], ["ben-carter", "mens-beard"],
  ["devon-cole", "mens-haircut-beard"], ["marco-ferreira", "mens-haircut-beard"], ["ben-carter", "mens-haircut-beard"],
  ["devon-cole", "mens-shaving"], ["marco-ferreira", "mens-shaving"],
  ["devon-cole", "mens-styling"], ["priya-shah", "mens-styling"], ["ben-carter", "mens-styling"],
  ["amara-lee", "womens-haircut"], ["priya-shah", "womens-haircut"], ["yuki-tanaka", "womens-haircut"], ["nadia-hassan", "womens-haircut"],
  ["amara-lee", "womens-coloring"], ["yuki-tanaka", "womens-coloring"],
  ["amara-lee", "womens-highlights"], ["yuki-tanaka", "womens-highlights"],
  ["amara-lee", "womens-blow-dry"], ["priya-shah", "womens-blow-dry"], ["nadia-hassan", "womens-blow-dry"],
  ["amara-lee", "womens-styling"], ["priya-shah", "womens-styling"], ["nadia-hassan", "womens-styling"],
  ["priya-shah", "womens-treatment"], ["yuki-tanaka", "womens-treatment"], ["nadia-hassan", "womens-treatment"],
];

function die(msg, err) {
  console.error(msg, err?.message ?? err ?? "");
  process.exit(1);
}

async function main() {
  // 1. service images
  for (const slug of SERVICE_SLUGS) {
    const { error } = await supabase
      .from("services")
      .update({ photo_url: `${CDN}/services/${slug}.webp` })
      .eq("slug", slug);
    if (error) die("service update", error);
  }

  // 2. staff upsert
  for (const [id, name, slug, title, bio] of STAFF) {
    const { error } = await supabase.from("staff").upsert(
      { id, name, slug, title, bio, active: true, photo_url: `${CDN}/staff/${slug}.webp` },
      { onConflict: "id" },
    );
    if (error) die(`staff upsert ${slug}`, error);
  }

  const { data: staffRows } = await supabase.from("staff").select("id, slug");
  const { data: serviceRows } = await supabase.from("services").select("id, slug");
  const staffId = Object.fromEntries(staffRows.map((r) => [r.slug, r.id]));
  const serviceId = Object.fromEntries(serviceRows.map((r) => [r.slug, r.id]));

  // 3. staff_services — replace
  await supabase.from("staff_services").delete().neq("staff_id", "00000000-0000-0000-0000-000000000000");
  const linkRows = LINKS.map(([s, v]) => ({
    staff_id: staffId[s],
    service_id: serviceId[v],
  }));
  {
    const { error } = await supabase.from("staff_services").insert(linkRows);
    if (error) die("links insert", error);
  }

  // 4. working hours — replace (Tue–Sat, minus each stylist's day off)
  await supabase.from("staff_working_hours").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  const hourRows = [];
  for (const [id, , slug, , , off] of STAFF) {
    for (const wd of [2, 3, 4, 5, 6]) {
      if (wd === off) continue;
      hourRows.push({ staff_id: id, weekday: wd, start_time: "09:00", end_time: "18:00" });
    }
  }
  {
    const { error } = await supabase.from("staff_working_hours").insert(hourRows);
    if (error) die("hours insert", error);
  }

  console.log(
    `Synced: ${SERVICE_SLUGS.length} service images, ${STAFF.length} staff, ` +
      `${linkRows.length} links, ${hourRows.length} working-hour rows.`,
  );
}

main().catch((e) => die("unexpected", e));

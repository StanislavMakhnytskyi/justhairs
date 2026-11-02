// Applying the newer migrations to a database that already has data (which is
// what the live project is): rows must survive, and the app's own queries must
// keep working for the roles it uses.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { apply, as, boot, migrationFiles } from "./harness.mjs";

const files = migrationFiles();
const M0006 = files.find((f) => f.startsWith("0006"));
const M0007 = files.find((f) => f.startsWith("0007"));
const M0008 = files.find((f) => f.startsWith("0008"));

const count = async (db, t) => (await db.query(`select count(*)::int as n from ${t}`)).rows[0].n;

async function populated() {
  const db = await boot({ upTo: M0006 });
  const [svc] = (await db.query(`select id from services where slug = 'womens-haircut'`)).rows;
  const [slot] = (await db.query(`select starts_at, staff_id from get_day_availability($1, null, current_date, 14) order by starts_at limit 1`, [svc.id])).rows;
  const [appt] = (await db.query(`select * from book_appointment($1, $2, $3)`, [svc.id, slot.staff_id, slot.starts_at])).rows;
  await db.query(`update appointments set status = 'completed', customer_name = 'Sara Test', customer_email = 'sara@justhairs.test' where id = $1`, [appt.id]);
  await db.query(
    `insert into reviews (appointment_id, staff_id, service_id, rating, comment, reviewer_first) values ($1, $2, $3, 5, 'Lovely cut', 'Sara')`,
    [appt.id, slot.staff_id, svc.id],
  );
  return db;
}

describe("0007 on a populated database", () => {
  test("keeps every row and keeps the app's public reads working", async () => {
    const db = await populated();
    const before = { appointments: await count(db, "appointments"), reviews: await count(db, "reviews"), services: await count(db, "services") };
    await apply(db, M0007);
    assert.equal(await count(db, "appointments"), before.appointments);
    assert.equal(await count(db, "reviews"), before.reviews);
    assert.equal(await count(db, "services"), before.services);

    // what the Next.js pages read with the public key
    const feed = await as(db, "anon", `select id, rating, comment, created_at, reviewer_first, service_name, staff_name from public_reviews where comment is not null limit 3`);
    assert.equal(feed.rows[0].reviewer_first, "Sara");
    const overall = await as(db, "anon", `select rating, review_count from overall_rating`);
    assert.deepEqual([Number(overall.rows[0].rating), overall.rows[0].review_count], [5, 1]);
    const sr = await as(db, "anon", `select * from service_ratings`);
    assert.equal(sr.rows.length, 1);
    await as(db, "anon", `select * from services where active order by price_cents`);
  });

  test("on its own (without 0008) it already closes the dead auth-era tables to the API", async () => {
    const db = await populated();
    await apply(db, M0007);
    for (const t of ["profiles", "orders", "order_items", "payments", "favorites", "notifications"]) {
      for (const role of ["anon", "authenticated"]) {
        const r = await db.query(`select has_table_privilege('${role}', 'public.${t}', 'SELECT') as ok`);
        assert.equal(r.rows[0].ok, false, `${role} can still read ${t}`);
      }
    }
  });

  test("the server (service_role) can still run every booking function and read bookings", async () => {
    const db = await populated();
    await apply(db, M0007);
    const [svc] = (await db.query(`select id from services where slug = 'mens-beard'`)).rows;
    const slots = await as(db, "service_role", `select * from get_day_availability($1, null, current_date, 14)`, [svc.id]);
    assert.ok(slots.rows.length > 0);
    const { starts_at } = slots.rows[0];
    const booked = await as(db, "service_role", `select * from book_appointment($1, null, $2)`, [svc.id, starts_at]);
    assert.equal(booked.rows[0].status, "confirmed");
    const read = await as(db, "service_role", `select customer_email, service_id from appointments where id = $1`, [booked.rows[0].id]);
    assert.equal(read.rows.length, 1);
  });
});

describe("0008 on a populated database", () => {
  test("drops only the dead schema; bookings and reviews survive", async () => {
    const db = await populated();
    const before = { appointments: await count(db, "appointments"), reviews: await count(db, "reviews") };
    await apply(db, M0007);
    await apply(db, M0008);
    assert.equal(await count(db, "appointments"), before.appointments);
    assert.equal(await count(db, "reviews"), before.reviews);
    const cols = await db.query(`select table_name from information_schema.columns where table_schema = 'public' and column_name = 'customer_id'`);
    assert.deepEqual(cols.rows, []);
    const [{ n }] = (await db.query(`select count(*)::int as n from public_reviews`)).rows;
    assert.equal(n, 1);
  });
});

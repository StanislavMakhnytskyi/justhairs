// Database-layer tests: the rules Supabase's security / performance advisors
// check, plus the booking engine's behaviour, run against a throwaway Postgres
// (PGlite) that has every migration and the seed applied. No live project.
//
//   npm run test:db
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { apply, as, boot, migrationFiles } from "./harness.mjs";

/** @type {import("@electric-sql/pglite").PGlite} */
let db;
before(async () => {
  db = await boot();
});

const rows = async (sql, params) => (await db.query(sql, params)).rows;
const names = (r, col = "name") => r.map((x) => x[col]).sort();

describe("exposure (grants + RLS)", () => {
  test("RLS is enabled on every table in public", async () => {
    const r = await rows(`select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r','p') and not c.relrowsecurity`);
    assert.deepEqual(names(r), []);
  });

  test("anon and authenticated can never write to any table", async () => {
    const r = await rows(`
      select c.relname || ' ' || role || ' ' || priv as name
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      cross join (values ('anon'), ('authenticated')) as roles(role)
      cross join (values ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')) as privs(priv)
      where n.nspname = 'public' and c.relkind in ('r','p') and has_table_privilege(role, c.oid, priv)`);
    assert.deepEqual(names(r), []);
  });

  test("private tables (appointments, settings, staff time off) are closed to the API roles", async () => {
    for (const t of ["appointments", "app_settings", "staff_time_off"]) {
      for (const role of ["anon", "authenticated"]) {
        const [{ ok }] = await rows(`select has_table_privilege('${role}', 'public.${t}', 'SELECT') as ok`);
        assert.equal(ok, false, `${role} can read ${t}`);
      }
    }
  });

  test("the public catalog is readable", async () => {
    for (const t of ["service_categories", "services", "staff", "staff_services", "staff_working_hours"]) {
      const r = await as(db, "anon", `select count(*)::int as n from ${t}`);
      assert.ok(r.rows[0].n > 0, `anon sees no rows in ${t}`);
    }
  });

  test("reviews expose no appointment link: only the display columns are readable", async () => {
    const [{ table_select }] = await rows(`select has_table_privilege('anon', 'public.reviews', 'SELECT') as table_select`);
    assert.equal(table_select, false, "table-wide SELECT on reviews would expose appointment_id");
    for (const col of ["appointment_id"]) {
      const [{ ok }] = await rows(`select has_column_privilege('anon', 'public.reviews', '${col}', 'SELECT') as ok`);
      assert.equal(ok, false, `anon can read reviews.${col}`);
    }
    for (const col of ["rating", "comment", "reviewer_first", "service_id", "staff_id", "created_at"]) {
      const [{ ok }] = await rows(`select has_column_privilege('anon', 'public.reviews', '${col}', 'SELECT') as ok`);
      assert.equal(ok, true, `anon cannot read reviews.${col}`);
    }
  });

  test("every policy names its roles (no accidental PUBLIC policies)", async () => {
    const r = await rows(`select tablename || '.' || policyname as name from pg_policies where schemaname = 'public' and roles = '{public}'`);
    assert.deepEqual(names(r), []);
  });

  test("no policy calls auth functions per row", async () => {
    const r = await rows(`select tablename || '.' || policyname as name from pg_policies where schemaname = 'public'
      and (coalesce(qual,'') || coalesce(with_check,'')) ~ 'auth\\.uid\\(\\)|is_admin\\(\\)'`);
    assert.deepEqual(names(r), []);
  });

  test("views run as the caller (security_invoker)", async () => {
    const r = await rows(`select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'v' and not coalesce('security_invoker=true' = any(c.reloptions), false)`);
    assert.deepEqual(names(r), []);
  });
});

describe("functions", () => {
  test("every function pins an empty search_path", async () => {
    const r = await rows(`select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and not coalesce('search_path=""' = any(p.proconfig), false)`);
    assert.deepEqual(names(r), []);
  });

  test("no function is executable by PUBLIC, anon or authenticated", async () => {
    const r = await rows(`select p.proname as name from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and (p.proacl is null or p.proacl::text ~ '(^\\{|,)=X/'
             or has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'))`);
    assert.deepEqual(names(r), []);
  });

  test("the booking RPCs cannot be called with the public key", async () => {
    await assert.rejects(as(db, "anon", `select * from get_available_slots(gen_random_uuid(), null, current_date)`), /permission denied/);
    await assert.rejects(
      as(db, "anon", `select book_appointment(gen_random_uuid(), null, now() + interval '2 days')`),
      /permission denied/,
    );
  });
});

describe("indexes", () => {
  test("every foreign key column set is covered by an index", async () => {
    const r = await rows(`
      select c.conrelid::regclass || ' (' || c.conname || ')' as name
      from pg_constraint c
      join pg_namespace n on n.oid = c.connamespace
      where c.contype = 'f' and n.nspname = 'public'
        and not exists (
          select 1 from pg_index i
          where i.indrelid = c.conrelid
            and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] = c.conkey
        )`);
    assert.deepEqual(names(r), []);
  });

  test("the auth-era appointments_customer_idx is gone", async () => {
    const r = await rows(`select indexname as name from pg_indexes where schemaname = 'public' and indexname = 'appointments_customer_idx'`);
    assert.deepEqual(names(r), []);
  });
});

describe("booking engine", () => {
  async function firstSlot() {
    const [svc] = await rows(`select id from services where slug = 'mens-haircut'`);
    const [slot] = await rows(
      `select starts_at, staff_id from get_day_availability($1, null, current_date, 14) order by starts_at limit 1`,
      [svc.id],
    );
    assert.ok(slot, "the seeded salon should have open slots in the next two weeks");
    return { serviceId: svc.id, ...slot };
  }

  test("a booking is created with a confirmation code and the same slot cannot be taken twice", async () => {
    const s = await firstSlot();
    const [a] = await rows(`select * from book_appointment($1, $2, $3)`, [s.serviceId, s.staff_id, s.starts_at]);
    assert.match(a.confirmation_code, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.equal(a.status, "confirmed");
    await assert.rejects(
      db.query(`select * from book_appointment($1, $2, $3)`, [s.serviceId, s.staff_id, s.starts_at]),
      (e) => e.code === "JH409",
    );
  });

  test("'any specialist' falls through to the next free stylist", async () => {
    const s = await firstSlot();
    const taken = [];
    for (let i = 0; i < 5; i++) {
      try {
        const [a] = await rows(`select * from book_appointment($1, null, $2)`, [s.serviceId, s.starts_at]);
        taken.push(a.staff_id);
      } catch (e) {
        assert.equal(e.code, "JH409");
        break;
      }
    }
    assert.ok(taken.length >= 1);
    assert.equal(new Set(taken).size, taken.length, "each 'any' booking got a different stylist");
  });

  test("the database refuses overlapping active appointments for one stylist", async () => {
    const [svc] = await rows(`select id from services limit 1`);
    const [st] = await rows(`select id from staff limit 1`);
    const insert = () =>
      db.query(
        `insert into appointments (service_id, staff_id, starts_at, ends_at, status, price_cents)
         values ($1, $2, '2031-03-04 10:00+00', '2031-03-04 11:00+00', 'confirmed', 1000)`,
        [svc.id, st.id],
      );
    await insert();
    await assert.rejects(insert(), (e) => e.code === "23P01");
  });

  test("bookings outside the bookable window are refused", async () => {
    const [svc] = await rows(`select id from services limit 1`);
    await assert.rejects(db.query(`select book_appointment($1, null, now() - interval '1 day')`, [svc.id]), (e) => e.code === "JH409");
    await assert.rejects(db.query(`select book_appointment($1, null, now() + interval '120 days')`, [svc.id]), (e) => e.code === "JH409");
  });

  test("abandoned unpaid holds are released, held and paying ones are not", async () => {
    const [svc] = await rows(`select id from services limit 1`);
    const [st] = await rows(`select id from staff limit 1`);
    const ins = (code, extraCol, extraVal, when) =>
      db.query(
        `insert into appointments (service_id, staff_id, starts_at, ends_at, status, price_cents, confirmation_code, created_at${extraCol})
         values ($1, $2, $3::timestamptz, $3::timestamptz + interval '30 minutes', 'confirmed', 1000, $4, now() - interval '30 minutes'${extraVal})`,
        [svc.id, st.id, when, code],
      );
    await ins("STALE1", "", "", "2032-01-05 09:00+00");
    await ins("PAYNG1", ", stripe_session_id", ", 'cs_test_1'", "2032-01-05 11:00+00");
    await ins("LATER1", ", payment_status", ", 'pay_later'", "2032-01-05 13:00+00");
    const [{ release_stale_holds: n }] = await rows(`select release_stale_holds()`);
    assert.equal(n, 1);
    const left = await rows(`select confirmation_code as name from appointments where confirmation_code in ('STALE1','PAYNG1','LATER1')`);
    assert.deepEqual(names(left), ["LATER1", "PAYNG1"]);
  });

  test("past confirmed appointments are completed", async () => {
    const [svc] = await rows(`select id from services limit 1`);
    const [st] = await rows(`select id from staff limit 1`);
    await db.query(
      `insert into appointments (service_id, staff_id, starts_at, ends_at, status, price_cents, confirmation_code)
       values ($1, $2, now() - interval '3 hours', now() - interval '2 hours', 'confirmed', 1000, 'PAST01')`,
      [svc.id, st.id],
    );
    await rows(`select complete_past_appointments()`);
    const [a] = await rows(`select status from appointments where confirmation_code = 'PAST01'`);
    assert.equal(a.status, "completed");
  });
});

describe("ratings", () => {
  test("overall_rating is one aggregate row, readable by anon", async () => {
    const r = await as(db, "anon", `select rating, review_count from overall_rating`);
    assert.equal(r.rows.length, 1);
  });

  test("per-service ratings and the public review feed still work for anon", async () => {
    await as(db, "anon", `select * from service_ratings`);
    await as(db, "anon", `select * from staff_ratings`);
    await as(db, "anon", `select id, rating, comment, created_at, reviewer_first, service_name, staff_name from public_reviews limit 3`);
  });
});

describe("schema hygiene", () => {
  test("the auth-era schema is gone", async () => {
    const r = await rows(`select tablename as name from pg_tables where schemaname = 'public'
      and tablename in ('profiles','orders','order_items','payments','favorites','notifications')`);
    assert.deepEqual(names(r), []);
    const t = await rows(`select tgname as name from pg_trigger where tgrelid = 'auth.users'::regclass and not tgisinternal`);
    assert.deepEqual(names(t), []);
  });

  test("the last two migrations can be re-run without error", async () => {
    const files = migrationFiles();
    for (const f of files.slice(-2)) await apply(db, f);
    for (const f of files.slice(-2)) await apply(db, f);
  });
});

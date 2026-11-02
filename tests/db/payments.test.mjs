// Migration 0009: hold token, atomic payment transitions, open-hold cap and the
// extended sweeper — on the throwaway Postgres, never the live project.
import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { as, boot } from "./harness.mjs";

/** @type {import("@electric-sql/pglite").PGlite} */
let db;
let svcId;
before(async () => {
  db = await boot();
  svcId = (await db.query(`select id from services where active and online_booking limit 1`)).rows[0].id;
});

const rows = async (sql, params) => (await db.query(sql, params)).rows;

/** A hold on the earliest free slot (booked slots drop out of availability). */
async function hold(clientKey = null) {
  const slot = (
    await rows(
      `select starts_at, staff_id from get_day_availability($1, null, current_date + 1, 28) order by starts_at limit 1`,
      [svcId],
    )
  )[0];
  assert.ok(slot, "seed should offer a slot");
  const [a] = await rows(`select * from book_appointment($1, $2, $3, $4)`, [svcId, slot.staff_id, slot.starts_at, clientKey]);
  return a;
}

describe("hold token", () => {
  test("every hold gets its own token", async () => {
    const a = await hold();
    const b = await hold();
    assert.ok(a.hold_token && b.hold_token);
    assert.notEqual(a.hold_token, b.hold_token);
  });

  test("the old 3-argument call shape still works (default client key)", async () => {
    const slot = (await rows(`select starts_at, staff_id from get_day_availability($1, null, current_date + 40, 28) order by starts_at limit 1`, [svcId]))[0];
    assert.ok(slot);
    const [a] = await rows(`select * from book_appointment($1, $2, $3)`, [svcId, slot.staff_id, slot.starts_at]);
    assert.equal(a.client_key, null);
  });

  test("the token is not readable by the API roles", async () => {
    for (const role of ["anon", "authenticated"]) {
      const [{ ok }] = await rows(`select has_column_privilege('${role}', 'public.appointments', 'hold_token', 'SELECT') as ok`);
      assert.equal(ok, false);
    }
  });
});

describe("record_payment", () => {
  async function withSession(sessionId) {
    const a = await hold();
    await db.query(`update appointments set stripe_session_id = $2 where id = $1`, [a.id, sessionId]);
    return a;
  }
  const pay = async (id, session, amount) => (await rows(`select record_payment($1, $2, $3) as r`, [id, session, amount]))[0].r;

  test("marks paid once, then reports a duplicate", async () => {
    const a = await withSession("cs_test_ok");
    assert.equal(await pay(a.id, "cs_test_ok", a.price_cents), "paid");
    assert.equal(await pay(a.id, "cs_test_ok", a.price_cents), "duplicate");
    const [r] = await rows(`select payment_status from appointments where id = $1`, [a.id]);
    assert.equal(r.payment_status, "paid");
  });

  test("refuses a wrong amount or a different session, changing nothing", async () => {
    const a = await withSession("cs_test_amt");
    assert.equal(await pay(a.id, "cs_test_amt", a.price_cents - 1), "mismatch");
    assert.equal(await pay(a.id, "cs_other", a.price_cents), "mismatch");
    const [r] = await rows(`select payment_status from appointments where id = $1`, [a.id]);
    assert.equal(r.payment_status, "unpaid");
  });

  test("unknown booking; a cancelled booking is not resurrected", async () => {
    assert.equal(await pay("00000000-0000-0000-0000-000000000000", "cs_x", 1), "unknown");
    const a = await withSession("cs_test_cancelled");
    await db.query(`update appointments set status = 'cancelled' where id = $1`, [a.id]);
    assert.equal(await pay(a.id, "cs_test_cancelled", a.price_cents), "cancelled");
    const [r] = await rows(`select payment_status from appointments where id = $1`, [a.id]);
    assert.equal(r.payment_status, "unpaid");
  });
});

describe("cancel_unpaid_booking", () => {
  const cancel = async (id, token) => (await rows(`select cancel_unpaid_booking($1, $2) as r`, [id, token]))[0].r;

  test("needs the right token and frees the slot", async () => {
    const a = await hold();
    assert.equal(await cancel(a.id, "00000000-0000-0000-0000-000000000000"), "not_found");
    assert.equal(await cancel(a.id, a.hold_token), "cancelled");
    assert.equal(await cancel(a.id, a.hold_token), "cancelled"); // idempotent
    const [r] = await rows(`select status from appointments where id = $1`, [a.id]);
    assert.equal(r.status, "cancelled");
    // the slot can be booked again
    await rows(`select * from book_appointment($1, $2, $3)`, [svcId, a.staff_id, a.starts_at]);
  });

  test("never cancels a paid booking", async () => {
    const a = await hold();
    await db.query(`update appointments set payment_status = 'paid' where id = $1`, [a.id]);
    assert.equal(await cancel(a.id, a.hold_token), "paid");
    const [r] = await rows(`select status from appointments where id = $1`, [a.id]);
    assert.equal(r.status, "confirmed");
  });

  test("leaves completed, no-show and pay-at-salon bookings alone", async () => {
    for (const set of [`status = 'completed'`, `status = 'no_show'`, `payment_status = 'pay_later'`]) {
      const a = await hold();
      await db.query(`update appointments set ${set} where id = $1`, [a.id]);
      const before = (await rows(`select status, payment_status from appointments where id = $1`, [a.id]))[0];
      assert.equal(await cancel(a.id, a.hold_token), "not_cancellable", set);
      const after = (await rows(`select status, payment_status from appointments where id = $1`, [a.id]))[0];
      assert.deepEqual(after, before);
    }
  });

  test("an already cancelled booking stays cancelled", async () => {
    const a = await hold();
    await db.query(`update appointments set status = 'cancelled' where id = $1`, [a.id]);
    assert.equal(await cancel(a.id, a.hold_token), "cancelled");
  });
});

describe("release_checkout_session", () => {
  test("clears an unpaid session but never a paid one", async () => {
    const a = await hold();
    const b = await hold();
    await db.query(`update appointments set stripe_session_id = 'cs_rel_a', stripe_session_expires_at = now() where id = $1`, [a.id]);
    await db.query(`update appointments set stripe_session_id = 'cs_rel_b', payment_status = 'paid' where id = $1`, [b.id]);
    assert.equal((await rows(`select release_checkout_session('cs_rel_a') as n`))[0].n, 1);
    assert.equal((await rows(`select release_checkout_session('cs_rel_b') as n`))[0].n, 0);
    const [r] = await rows(`select stripe_session_id from appointments where id = $1`, [b.id]);
    assert.equal(r.stripe_session_id, "cs_rel_b");
  });

  test("expire -> retry: releasing a session bumps checkout_attempt (fresh idempotency key)", async () => {
    const a = await hold();
    assert.equal(a.checkout_attempt, 0);
    await db.query(`update appointments set stripe_session_id = 'cs_att_1', stripe_session_expires_at = now() where id = $1`, [a.id]);
    assert.equal((await rows(`select release_checkout_session('cs_att_1') as n`))[0].n, 1);
    let [r] = await rows(`select checkout_attempt, stripe_session_id, status from appointments where id = $1`, [a.id]);
    assert.equal(r.checkout_attempt, 1);
    assert.equal(r.stripe_session_id, null);
    assert.equal(r.status, "confirmed");
    // second session on the same booking, expired again
    await db.query(`update appointments set stripe_session_id = 'cs_att_2', stripe_session_expires_at = now() where id = $1`, [a.id]);
    await rows(`select release_checkout_session('cs_att_2')`);
    [r] = await rows(`select checkout_attempt from appointments where id = $1`, [a.id]);
    assert.equal(r.checkout_attempt, 2);
    // a repeated (retried) expire webhook changes nothing
    assert.equal((await rows(`select release_checkout_session('cs_att_2') as n`))[0].n, 0);
    [r] = await rows(`select checkout_attempt from appointments where id = $1`, [a.id]);
    assert.equal(r.checkout_attempt, 2);
  });
});

describe("open-hold cap", () => {
  test("a client key gets 5 open holds, the 6th is refused with JH429", async () => {
    for (let i = 0; i < 5; i++) await hold("client-cap");
    await assert.rejects(hold("client-cap"), (e) => e.code === "JH429");
    await hold("someone-else"); // another client is unaffected
  });

  test("cancelling frees capacity", async () => {
    const k = "client-cap-2";
    const first = await hold(k);
    for (let i = 0; i < 4; i++) await hold(k);
    await assert.rejects(hold(k), (e) => e.code === "JH429");
    await rows(`select cancel_unpaid_booking($1, $2)`, [first.id, first.hold_token]);
    await hold(k);
  });
});

describe("release_stale_holds (0009)", () => {
  test("cancels long-expired sessions, leaves live, recent, legacy and pay-later holds", async () => {
    const expired = await hold();
    const recentlyExpired = await hold();
    const live = await hold();
    const legacy = await hold();
    const oldLater = await hold();
    await db.query(`update appointments set stripe_session_id = 'cs_s_exp', stripe_session_expires_at = now() - interval '7 hours' where id = $1`, [expired.id]);
    await db.query(`update appointments set stripe_session_id = 'cs_s_rec', stripe_session_expires_at = now() - interval '2 hours' where id = $1`, [recentlyExpired.id]);
    await db.query(`update appointments set stripe_session_id = 'cs_s_live', stripe_session_expires_at = now() + interval '20 minutes' where id = $1`, [live.id]);
    await db.query(`update appointments set stripe_session_id = 'cs_s_legacy' where id = $1`, [legacy.id]);
    await db.query(`update appointments set payment_status = 'pay_later', created_at = now() - interval '5 days' where id = $1`, [oldLater.id]);
    await rows(`select release_stale_holds()`);
    const status = async (a) => (await rows(`select status from appointments where id = $1`, [a.id]))[0].status;
    assert.equal(await status(expired), "cancelled");
    assert.equal(await status(recentlyExpired), "confirmed");
    assert.equal(await status(live), "confirmed");
    assert.equal(await status(legacy), "confirmed");
    assert.equal(await status(oldLater), "confirmed"); // pay-at-salon is never swept
  });

  test("sessionless unpaid holds are deleted only after 30 minutes", async () => {
    const fresh = await hold();
    const mid = await hold();
    const old = await hold();
    await db.query(`update appointments set created_at = now() - interval '20 minutes' where id = $1`, [mid.id]);
    await db.query(`update appointments set created_at = now() - interval '31 minutes' where id = $1`, [old.id]);
    await rows(`select release_stale_holds()`);
    const exists = async (a) => (await rows(`select 1 from appointments where id = $1`, [a.id])).length === 1;
    assert.equal(await exists(fresh), true);
    assert.equal(await exists(mid), true);
    assert.equal(await exists(old), false);
  });
});

describe("grants", () => {
  test("the payment functions are service_role only", async () => {
    const fns = [
      "record_payment(uuid, text, int)",
      "cancel_unpaid_booking(uuid, uuid)",
      "release_checkout_session(text)",
      "book_appointment(uuid, uuid, timestamptz, text)",
    ];
    for (const fn of fns) {
      for (const role of ["anon", "authenticated"]) {
        const [{ ok }] = await rows(`select has_function_privilege('${role}', 'public.${fn}', 'EXECUTE') as ok`);
        assert.equal(ok, false, `${role} can run ${fn}`);
      }
      const [{ ok }] = await rows(`select has_function_privilege('service_role', 'public.${fn}', 'EXECUTE') as ok`);
      assert.equal(ok, true, `service_role cannot run ${fn}`);
    }
    await assert.rejects(as(db, "anon", `select record_payment(gen_random_uuid(), 'x', 1)`), /permission denied/);
  });
});

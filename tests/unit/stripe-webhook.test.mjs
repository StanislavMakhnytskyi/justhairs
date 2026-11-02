// The webhook core under Node's built-in TypeScript support: real Stripe
// signatures (generateTestHeaderString), fake database. No network, no Supabase.
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";
import { handleStripeWebhook } from "../../src/lib/stripe-webhook.ts";

const stripe = new Stripe("sk_test_unit");
const secret = "whsec_unit_test_secret";
const APPT = "11111111-2222-3333-4444-555555555555";
const quiet = { error() {}, warn() {} };

function event(type, object, id = "evt_1") {
  return JSON.stringify({ id, object: "event", type, data: { object } });
}
const session = (over = {}) => ({
  id: "cs_test_1",
  object: "checkout.session",
  payment_status: "paid",
  currency: "eur",
  amount_total: 3500,
  metadata: { appointment_id: APPT },
  ...over,
});
const sign = (payload, s = secret) => stripe.webhooks.generateTestHeaderString({ payload, secret: s });

function fakeStore(outcome = "paid") {
  const calls = { record: [], release: [] };
  return {
    calls,
    async recordPayment(a) {
      calls.record.push(a);
      return outcome;
    },
    async releaseSession(s) {
      calls.release.push(s);
    },
  };
}
const run = (payload, signature, store) => handleStripeWebhook({ payload, signature, secret, stripe, store, log: quiet });

describe("stripe webhook", () => {
  test("a valid signed completed event records the payment", async () => {
    const store = fakeStore();
    const payload = event("checkout.session.completed", session());
    const res = await run(payload, sign(payload), store);
    assert.deepEqual(res, { status: 200, body: "paid" });
    assert.deepEqual(store.calls.record, [{ appointmentId: APPT, sessionId: "cs_test_1", amountTotal: 3500 }]);
  });

  test("an invalid signature is rejected and nothing is recorded", async () => {
    const store = fakeStore();
    const payload = event("checkout.session.completed", session());
    const res = await run(payload, sign(payload, "whsec_wrong"), store);
    assert.equal(res.status, 400);
    assert.equal(store.calls.record.length, 0);
  });

  test("a tampered body fails the signature", async () => {
    const store = fakeStore();
    const payload = event("checkout.session.completed", session());
    const tampered = payload.replace("3500", "1");
    assert.equal((await run(tampered, sign(payload), store)).status, 400);
    assert.equal(store.calls.record.length, 0);
  });

  test("a missing signature header is rejected", async () => {
    assert.equal((await run("{}", null, fakeStore())).status, 400);
  });

  test("a duplicate delivery is acknowledged (200)", async () => {
    const store = fakeStore("duplicate");
    const payload = event("checkout.session.completed", session());
    assert.deepEqual(await run(payload, sign(payload), store), { status: 200, body: "duplicate" });
  });

  test("an amount mismatch reported by the store is acknowledged but logged", async () => {
    const store = fakeStore("mismatch");
    const errors = [];
    const payload = event("checkout.session.completed", session({ amount_total: 1 }));
    const res = await handleStripeWebhook({
      payload,
      signature: sign(payload),
      secret,
      stripe,
      store,
      log: { error: (m) => errors.push(m), warn() {} },
    });
    assert.equal(res.status, 200);
    assert.match(errors[0], /not applied \(mismatch\)/);
  });

  test("a wrong currency or missing amount never reaches the store", async () => {
    for (const over of [{ currency: "usd" }, { amount_total: null }]) {
      const store = fakeStore();
      const payload = event("checkout.session.completed", session(over));
      assert.equal((await run(payload, sign(payload), store)).body, "mismatch");
      assert.equal(store.calls.record.length, 0);
    }
  });

  test("an unpaid completed session (async payment method) is ignored", async () => {
    const store = fakeStore();
    const payload = event("checkout.session.completed", session({ payment_status: "unpaid" }));
    assert.equal((await run(payload, sign(payload), store)).status, 200);
    assert.equal(store.calls.record.length, 0);
  });

  test("a missing or malformed appointment id is ignored", async () => {
    for (const metadata of [{}, { appointment_id: "not-a-guid" }]) {
      const store = fakeStore();
      const payload = event("checkout.session.completed", session({ metadata }));
      assert.equal((await run(payload, sign(payload), store)).body, "ignored");
      assert.equal(store.calls.record.length, 0);
    }
  });

  test("an expired session is released", async () => {
    const store = fakeStore();
    const payload = event("checkout.session.expired", session({ payment_status: "unpaid" }));
    assert.equal((await run(payload, sign(payload), store)).status, 200);
    assert.deepEqual(store.calls.release, ["cs_test_1"]);
  });

  test("an async payment that succeeds later is recorded as paid", async () => {
    const store = fakeStore();
    const payload = event("checkout.session.async_payment_succeeded", session());
    assert.deepEqual(await run(payload, sign(payload), store), { status: 200, body: "paid" });
    assert.deepEqual(store.calls.record, [{ appointmentId: APPT, sessionId: "cs_test_1", amountTotal: 3500 }]);
  });

  test("an async payment that fails releases the session", async () => {
    const store = fakeStore();
    const payload = event("checkout.session.async_payment_failed", session({ payment_status: "unpaid" }));
    assert.equal((await run(payload, sign(payload), store)).status, 200);
    assert.deepEqual(store.calls.release, ["cs_test_1"]);
    assert.equal(store.calls.record.length, 0);
  });

  test("cancelled / mismatch / unknown outcomes are logged loudly", async () => {
    for (const outcome of ["cancelled", "mismatch", "unknown"]) {
      const errors = [];
      const payload = event("checkout.session.completed", session());
      const res = await handleStripeWebhook({
        payload,
        signature: sign(payload),
        secret,
        stripe,
        store: fakeStore(outcome),
        log: { error: (m) => errors.push(m), warn() {} },
      });
      assert.equal(res.status, 200);
      assert.match(errors[0], new RegExp(`not applied \\(${outcome}\\)`));
    }
  });

  test("a database failure returns 500 so Stripe retries", async () => {
    const store = {
      recordPayment: async () => {
        throw new Error("db down");
      },
      releaseSession: async () => {},
    };
    const payload = event("checkout.session.completed", session());
    assert.equal((await run(payload, sign(payload), store)).status, 500);
  });

  test("other event types are acknowledged and ignored", async () => {
    const payload = event("charge.refunded", { id: "ch_1" });
    assert.deepEqual(await run(payload, sign(payload), fakeStore()), { status: 200, body: "ignored" });
  });
});

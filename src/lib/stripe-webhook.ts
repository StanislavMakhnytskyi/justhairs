// Pure core of the Stripe webhook: signature check, event routing and the
// sanity checks on a completed session. No framework imports (and only a type
// import from stripe) so tests/unit can run it directly under Node.
import type Stripe from "stripe";

export type PaymentOutcome = "paid" | "duplicate" | "mismatch" | "cancelled" | "unknown";

/** The database side, injected so the handler can be tested without Supabase. */
export type PaymentStore = {
  recordPayment(args: {
    appointmentId: string;
    sessionId: string;
    amountTotal: number;
  }): Promise<PaymentOutcome>;
  releaseSession(sessionId: string): Promise<void>;
};

type EventVerifier = {
  webhooks: {
    constructEvent(payload: string, header: string, secret: string): Stripe.Event;
  };
};

export type WebhookResult = { status: number; body: string };

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * @param payload  the RAW request body (`await req.text()`), byte for byte —
 *                 re-serialised JSON would not match the signature.
 * @returns 400 for a bad signature (Stripe will not retry usefully), 500 when
 *          the database fails (Stripe retries), 200 otherwise — including for
 *          events we deliberately ignore or payments we refuse to apply, which
 *          retrying cannot fix; those are logged for a human.
 */
export async function handleStripeWebhook(args: {
  payload: string;
  signature: string | null;
  secret: string;
  stripe: EventVerifier;
  store: PaymentStore;
  log?: Pick<Console, "error" | "warn">;
}): Promise<WebhookResult> {
  const { payload, signature, secret, stripe, store } = args;
  const log = args.log ?? console;

  if (!signature) return { status: 400, body: "Missing signature" };

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return { status: 400, body: "Invalid signature" };
  }

  try {
    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const session = event.data.object;
      const appointmentId = session.metadata?.appointment_id;
      if (!appointmentId || !GUID.test(appointmentId)) {
        log.warn(`[stripe] ${event.id}: completed session ${session.id} has no appointment id`);
        return { status: 200, body: "ignored" };
      }
      // An async payment method can complete before the money has moved.
      if (session.payment_status !== "paid") {
        return { status: 200, body: "not paid yet" };
      }
      if (session.currency !== "eur" || typeof session.amount_total !== "number") {
        log.error(`[stripe] ${event.id}: unexpected currency/amount on ${session.id}`);
        return { status: 200, body: "mismatch" };
      }
      const outcome = await store.recordPayment({
        appointmentId,
        sessionId: session.id,
        amountTotal: session.amount_total,
      });
      if (outcome === "mismatch" || outcome === "cancelled" || outcome === "unknown") {
        log.error(
          `[stripe] ${event.id}: payment for session ${session.id} / booking ${appointmentId} not applied (${outcome}) — check and refund if needed`,
        );
      }
      return { status: 200, body: outcome };
    }

    if (
      event.type === "checkout.session.expired" ||
      event.type === "checkout.session.async_payment_failed"
    ) {
      await store.releaseSession(event.data.object.id);
      return { status: 200, body: "released" };
    }
  } catch (e) {
    log.error(`[stripe] ${event.id}: handler failed`, e);
    return { status: 500, body: "Handler error" };
  }

  return { status: 200, body: "ignored" };
}

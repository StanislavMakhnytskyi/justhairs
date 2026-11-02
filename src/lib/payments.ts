import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { PaymentOutcome, PaymentStore } from "@/lib/stripe-webhook";

const OUTCOMES: readonly PaymentOutcome[] = ["paid", "duplicate", "mismatch", "cancelled", "unknown"];

/** Supabase-backed PaymentStore: every transition is a row-locked database
 *  function (migration 0009), so webhook, return-from-Stripe and "back out"
 *  can race without a paid booking being lost. */
export const paymentStore: PaymentStore = {
  async recordPayment({ appointmentId, sessionId, amountTotal }) {
    const { data, error } = await createAdminClient().rpc("record_payment", {
      p_appointment_id: appointmentId,
      p_session_id: sessionId,
      p_amount_total: amountTotal,
    });
    if (error) throw new Error(`record_payment failed: ${error.message}`);
    return OUTCOMES.find((o) => o === data) ?? "unknown";
  },
  async releaseSession(sessionId) {
    const { error } = await createAdminClient().rpc("release_checkout_session", {
      p_session_id: sessionId,
    });
    if (error) throw new Error(`release_checkout_session failed: ${error.message}`);
  },
};

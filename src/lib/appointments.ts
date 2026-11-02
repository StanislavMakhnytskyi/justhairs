import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { paymentStore } from "@/lib/payments";
import type { Appointment, PaymentStatus, Service, Staff } from "@/lib/supabase/types";

const guid = z.guid();

export type AppointmentDetail = Appointment & {
  service: Pick<Service, "id" | "name" | "slug" | "duration_min">;
  staff: Pick<Staff, "id" | "name" | "title"> | null;
};

/** payment_status is a text column guarded by a CHECK constraint, so the
 *  generated type is `string`; narrow it (and fail safe) in one place. */
export function toPaymentStatus(value: string): PaymentStatus {
  return value === "paid" || value === "pay_later" ? value : "unpaid";
}

/**
 * One appointment by id, for the payment + confirmation pages. Appointments
 * carry the guest's contact details, so this uses the service-role key (anon
 * has no read access). It needs the booking's hold token (the HttpOnly cookie
 * set when the hold was created) as well as the id: a bare id from a URL
 * returns nothing. Both are shape-checked before touching the database.
 *
 * Both callers `notFound()` when this returns null; the pages live in the
 * `(secure)` route group so that is a real 404 (CODE_REVIEW.md #19, fixed;
 * asserted in tests/smoke/routes.spec.ts).
 */
export async function getAppointment(id: string, holdToken: string | null) {
  if (!isSupabaseConfigured) return null;
  if (!holdToken || !guid.safeParse(id).success || !guid.safeParse(holdToken).success) {
    return null;
  }
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("appointments")
      .select("*, service:services(id, name, slug, duration_min), staff:staff(id, name, title)")
      .eq("id", id)
      .eq("hold_token", holdToken)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return { ...data, payment_status: toPaymentStatus(data.payment_status) };
  } catch (e) {
    console.error("[supabase] getAppointment failed:", e);
    return null;
  }
}

/**
 * Stripe redirects back to the confirmation page with `?session_id=` after
 * Checkout. This is the fast path; the webhook (/api/stripe/webhook) is the
 * source of truth and does the same thing. Both go through the `record_payment`
 * database function, which verifies the session id and the amount under a row
 * lock and is idempotent, so a refresh, a retry or a race is harmless.
 */
export async function reconcileCheckout(
  appointmentId: string,
  sessionId: string,
): Promise<"paid" | "pending" | "noop"> {
  if (!stripe || !isSupabaseConfigured) return "noop";
  if (!guid.safeParse(appointmentId).success || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return "noop";
  }
  try {
    const supabase = createAdminClient();
    const { data: appt } = await supabase
      .from("appointments")
      .select("payment_status")
      .eq("id", appointmentId)
      .maybeSingle();
    // pay_later rows too: a guest who paid by card just before choosing
    // pay-at-salon (or on a stale tab) must still be marked paid.
    if (!appt || (appt.payment_status !== "unpaid" && appt.payment_status !== "pay_later")) {
      return "noop";
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.metadata?.appointment_id !== appointmentId ||
      session.payment_status !== "paid" ||
      session.currency !== "eur" ||
      typeof session.amount_total !== "number"
    ) {
      return "pending";
    }

    const outcome = await paymentStore.recordPayment({
      appointmentId,
      sessionId: session.id,
      amountTotal: session.amount_total,
    });
    return outcome === "paid" || outcome === "duplicate" ? "paid" : "pending";
  } catch (e) {
    console.error("[stripe] reconcileCheckout failed", e);
    return "pending";
  }
}

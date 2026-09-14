import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import type { Appointment, Service, Staff } from "@/lib/supabase/types";

export type AppointmentDetail = Appointment & {
  service: Pick<Service, "id" | "name" | "slug" | "duration_min">;
  staff: Pick<Staff, "id" | "name" | "title"> | null;
};

const SELECT =
  "*, service:services(id,name,slug,duration_min), staff:staff(id,name,title)";

/**
 * One appointment by id, for the payment + confirmation pages. Appointments
 * carry the guest's contact details, so this uses the service-role key (anon
 * has no read access) — only ever called server-side with an id from the URL.
 *
 * KNOWN ISSUE (CODE_REVIEW.md #19): both callers `notFound()` when this
 * returns null, but that ends up responding HTTP 200, not 404 — Next
 * commits the response status before this async lookup resolves and the
 * throw happens. See tests/smoke/routes.spec.ts, which asserts the current
 * (wrong) status on purpose so the suite tracks it rather than masking it.
 */
export async function getAppointment(id: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("appointments")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    return (data as AppointmentDetail | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Stripe redirects back to the confirmation page with `?session_id=` after
 * Checkout. There is no webhook — we verify the session with Stripe here and
 * flip the appointment to `paid`. Idempotent: only acts while it's still
 * `unpaid`, so a refresh is harmless.
 */
export async function reconcileCheckout(
  appointmentId: string,
  sessionId: string,
): Promise<"paid" | "pending" | "noop"> {
  if (!stripe || !isSupabaseConfigured) return "noop";
  try {
    const supabase = createAdminClient();
    const { data: appt } = await supabase
      .from("appointments")
      .select("payment_status")
      .eq("id", appointmentId)
      .maybeSingle();
    if (!appt || appt.payment_status !== "unpaid") return "noop";

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (
      session.metadata?.appointment_id !== appointmentId ||
      session.payment_status !== "paid"
    ) {
      return "pending";
    }

    await supabase
      .from("appointments")
      .update({ payment_status: "paid" })
      .eq("id", appointmentId);
    return "paid";
  } catch {
    return "pending";
  }
}

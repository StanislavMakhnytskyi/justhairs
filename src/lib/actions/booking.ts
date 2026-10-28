"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient, createPublicClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { formatDateTime } from "@/lib/format";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Loose UUID shape — z.uuid() enforces RFC version/variant bits, which the
// seeded staff ids (2222...-0000-...) don't satisfy. These ids only get bound
// as RPC parameters, so shape is all we need.
const id = z.guid();

const bookSchema = z.object({
  serviceId: id,
  staffId: id.nullable(),
  // Any date-parseable string — the slot times come straight from Postgres
  // (offset + microsecond format), which Zod's strict .datetime() rejects.
  startsAt: z.string().refine((s) => !Number.isNaN(Date.parse(s)), "bad date"),
});

// Mirrors the bookable window enforced in SQL (migration 0006).
const MAX_DAYS_AHEAD = 90;
const MAX_RANGE_DAYS = 31;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "bad day");

function withinBookableWindow(day: string): boolean {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return false;
  const now = Date.now();
  return t >= now - 2 * DAY_MS && t <= now + (MAX_DAYS_AHEAD + 1) * DAY_MS;
}

const slotsSchema = z.object({
  serviceId: id,
  staffId: id.nullable(),
  day: dayString.refine(withinBookableWindow, "out of range"),
});

const rangeSchema = z.object({
  serviceId: id,
  staffId: id.nullable(),
  from: dayString.refine(withinBookableWindow, "out of range"),
  days: z.number().int().min(1).max(MAX_RANGE_DAYS),
});

/** Postgres SQLSTATE raised by book_appointment when the slot is gone. */
const SLOT_TAKEN = "JH409";

/** Hold a slot. No sign-in — the appointment is created with a guest code and
 *  contact details are attached on the payment step. */
export async function createBooking(
  input: z.infer<typeof bookSchema>,
): Promise<ActionResult<{ id: string; code: string }>> {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid booking details." };

  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_service_id: parsed.data.serviceId,
    p_staff_id: parsed.data.staffId,
    p_starts_at: new Date(parsed.data.startsAt).toISOString(),
  });

  if (error) {
    if (error.code === SLOT_TAKEN) {
      return { ok: false, error: "That time was just taken. Pick another slot." };
    }
    console.error("book_appointment failed", error);
    return { ok: false, error: "Could not create the booking. Please try again." };
  }

  const row = data as { id: string; confirmation_code: string | null };
  return { ok: true, data: { id: row.id, code: row.confirmation_code ?? "" } };
}

// TODO (CODE_REVIEW.md #7): these two throw instead of returning
// ActionResult like every other export in this file — inconsistent contract,
// kept because callers already expect it, but a footgun for the next caller.
export async function getAvailableSlots(input: {
  serviceId: string;
  staffId: string | null;
  day: string; // yyyy-MM-dd
}): Promise<string[]> {
  const parsed = slotsSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid availability request.");
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_service_id: parsed.data.serviceId,
    p_staff_id: parsed.data.staffId,
    p_day: parsed.data.day,
  });
  // Throw on a real RPC failure so callers can tell "the lookup broke" apart
  // from "this day genuinely has no slots" (an empty array).
  if (error) throw new Error(error.message || "Could not load availability.");
  if (!data) return [];
  return (data as { starts_at: string }[]).map((s) => s.starts_at);
}

/** Availability for a whole range in one round trip (see migration 0004). */
export async function getDayAvailability(input: {
  serviceId: string;
  staffId: string | null;
  from: string; // yyyy-MM-dd
  days: number;
}): Promise<string[]> {
  const parsed = rangeSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid availability request.");
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_day_availability", {
    p_service_id: parsed.data.serviceId,
    p_staff_id: parsed.data.staffId,
    p_from: parsed.data.from,
    p_days: parsed.data.days,
  });
  if (error) throw new Error(error.message || "Could not load availability.");
  if (!data) return [];
  return (data as { starts_at: string }[]).map((s) => s.starts_at);
}

const contactSchema = z.object({
  appointmentId: id,
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().min(5, "Phone is required").max(40),
});

async function loadPayable(appointmentId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select(
      "id, status, payment_status, price_cents, starts_at, customer_email, service:services(name)",
    )
    .eq("id", appointmentId)
    .maybeSingle();
  // KNOWN ISSUE (CODE_REVIEW.md #10): trusts the query's shape at compile
  // time only — a renamed column or the `service` embed coming back as an
  // array (Supabase's FK-cardinality inference can do that) fails silently
  // with undefined fields rather than a type error.
  return data as
    | {
        id: string;
        status: string;
        payment_status: string;
        price_cents: number;
        starts_at: string;
        customer_email: string | null;
        service: { name: string } | null;
      }
    | null;
}

/** Save the guest's contact details onto the held appointment. */
export async function saveGuestDetails(
  input: z.infer<typeof contactSchema>,
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const appt = await loadPayable(parsed.data.appointmentId);
  if (!appt || appt.status === "cancelled") {
    return { ok: false, error: "This booking is no longer active." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("appointments")
    .update({
      customer_name: parsed.data.name,
      customer_email: parsed.data.email,
      customer_phone: parsed.data.phone,
    })
    .eq("id", parsed.data.appointmentId);

  if (error) return { ok: false, error: "Could not save your details." };
  return { ok: true, data: undefined };
}

/** Back out of a held booking before paying — frees the slot again.
 *
 *  KNOWN ISSUE (CODE_REVIEW.md #3): appointmentId isn't schema-validated and
 *  there's no proof of ownership — anyone with the UUID can call this (and
 *  payLater / startCheckout below) for someone else's booking. Bounded by
 *  UUIDs not being enumerable, but inconsistent with createBooking/
 *  saveGuestDetails, which do validate.
 */
export async function abandonBooking(
  appointmentId: string,
): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select("payment_status, stripe_session_id")
    .eq("id", appointmentId)
    .maybeSingle();
  const row = data as
    | { payment_status: string; stripe_session_id: string | null }
    | null;
  if (!row) return { ok: true, data: undefined };
  if (row.payment_status === "paid") {
    return { ok: false, error: "This booking is already paid." };
  }

  // If a Checkout session was opened, make sure it isn't actually paid, then
  // close it out before we drop the row.
  if (row.stripe_session_id && stripe) {
    try {
      const s = await stripe.checkout.sessions.retrieve(row.stripe_session_id);
      if (s.payment_status === "paid") {
        await supabase
          .from("appointments")
          .update({ payment_status: "paid" })
          .eq("id", appointmentId);
        return { ok: false, error: "This booking was already paid." };
      }
      if (s.status === "open") {
        await stripe.checkout.sessions.expire(row.stripe_session_id).catch(() => {});
      }
    } catch {
      /* ignore — treat as not paid */
    }
  }

  // KNOWN ISSUE (CODE_REVIEW.md #2): TOCTOU — if the guest finishes paying on
  // Stripe's hosted page between the retrieve() above and this delete, a
  // paid appointment gets deleted anyway. The "still unpaid" check and the
  // delete need to be one atomic statement/transaction.
  await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId)
    .eq("payment_status", "unpaid");
  return { ok: true, data: undefined };
}

/** Choose to settle up at the salon. */
export async function payLater(
  appointmentId: string,
): Promise<ActionResult> {
  const appt = await loadPayable(appointmentId);
  if (!appt || appt.status === "cancelled") {
    return { ok: false, error: "This booking is no longer active." };
  }
  if (appt.payment_status === "paid") return { ok: true, data: undefined };

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("appointments")
    .update({ payment_status: "pay_later" })
    .eq("id", appointmentId);
  if (error) return { ok: false, error: "Something went wrong. Try again." };
  return { ok: true, data: undefined };
}

function siteOrigin(host: string | null): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (host) return `http${host.startsWith("localhost") ? "" : "s"}://${host}`;
  return "http://localhost:3000";
}

/** Create a Stripe Checkout session for the full service price. */
export async function startCheckout(
  appointmentId: string,
): Promise<ActionResult<{ url: string }>> {
  if (!stripe) return { ok: false, error: "Card payments aren't set up yet." };

  const appt = await loadPayable(appointmentId);
  if (!appt || appt.status === "cancelled") {
    return { ok: false, error: "This booking is no longer active." };
  }
  if (appt.payment_status === "paid") {
    return { ok: false, error: "This booking is already paid." };
  }

  const origin = siteOrigin((await headers()).get("host"));

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: appt.price_cents,
            product_data: {
              name: appt.service?.name ?? "Salon appointment",
              description: formatDateTime(appt.starts_at),
            },
          },
        },
      ],
      metadata: { appointment_id: appt.id },
      // Already collected on the guest-details form — Stripe skips asking again.
      customer_email: appt.customer_email ?? undefined,
      // No webhook — the confirmation page reconciles this session on return.
      success_url: `${origin}/book/confirmation/${appt.id}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/book/pay/${appt.id}`,
    });

    if (!session.url) return { ok: false, error: "Could not start checkout." };

    await createAdminClient()
      .from("appointments")
      .update({ stripe_session_id: session.id })
      .eq("id", appt.id);

    return { ok: true, data: { url: session.url } };
  } catch {
    // KNOWN ISSUE (CODE_REVIEW.md #6): blanket catch — a bad amount, an
    // expired key, a network blip and a real Stripe outage all collapse
    // into this one message with nothing logged server-side to tell them
    // apart.
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}

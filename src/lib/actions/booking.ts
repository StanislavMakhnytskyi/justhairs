"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/server";
import { toPaymentStatus } from "@/lib/appointments";
import { getHoldToken, setHoldToken } from "@/lib/hold-token";
import { paymentStore } from "@/lib/payments";
import { stripe } from "@/lib/stripe";
import { formatDateTime } from "@/lib/format";

/** Machine-readable failure reasons, so callers can branch without matching
 *  on the human message (which may be reworded). */
export type ActionErrorCode = "SLOT_TAKEN" | "TOO_MANY_HOLDS" | "INVALID" | "FAILED";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: ActionErrorCode };

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

/** Postgres SQLSTATEs raised by book_appointment. */
const SLOT_TAKEN = "JH409";
const TOO_MANY_HOLDS = "JH429";

/** A stable, non-reversible key for "this caller" (hashed IP) used by the
 *  database to cap open holds. Only the platform-set address is trusted: on
 *  Vercel `x-vercel-forwarded-for` is overwritten by the edge (we take its last
 *  hop). A raw `x-forwarded-for` / `x-real-ip` is client-controlled, so it is
 *  never used. Null when there is no trusted value (local dev, other hosts),
 *  which simply skips the cap — the real rate limit belongs at the edge. */
async function clientKey(): Promise<string | null> {
  if (!process.env.VERCEL) return null;
  const h = await headers();
  const ip = h.get("x-vercel-forwarded-for")?.split(",").at(-1)?.trim() || null;
  if (!ip) return null;
  return createHash("sha256").update(`justhairs:${ip}`).digest("hex");
}

/** Hold a slot. No sign-in — the appointment is created with a guest code, the
 *  caller's browser gets a per-booking secret in an HttpOnly cookie, and contact
 *  details are attached on the payment step. */
export async function createBooking(
  input: z.infer<typeof bookSchema>,
): Promise<ActionResult<{ id: string; code: string }>> {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid booking details.", code: "INVALID" };
  }

  // The booking functions are server-only: the public key cannot call them
  // (migration 0007), so they run with the server client.
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_service_id: parsed.data.serviceId,
    p_staff_id: parsed.data.staffId,
    p_starts_at: new Date(parsed.data.startsAt).toISOString(),
    p_client_key: await clientKey(),
  });

  if (error) {
    if (error.code === SLOT_TAKEN) {
      return {
        ok: false,
        error: "That time was just taken. Pick another slot.",
        code: "SLOT_TAKEN",
      };
    }
    if (error.code === TOO_MANY_HOLDS) {
      return {
        ok: false,
        error: "You have several unfinished bookings. Complete or cancel one, then try again.",
        code: "TOO_MANY_HOLDS",
      };
    }
    console.error("book_appointment failed", error);
    return {
      ok: false,
      error: "Could not create the booking. Please try again.",
      code: "FAILED",
    };
  }

  await setHoldToken(data.id, data.hold_token);
  return { ok: true, data: { id: data.id, code: data.confirmation_code ?? "" } };
}

// TODO (CODE_REVIEW.md #7): these two throw instead of returning
// ActionResult like every other export in this file — inconsistent contract,
// kept because callers already expect it, but a footgun for the next caller.
// They throw fixed strings only; the database error goes to the server log.
export async function getAvailableSlots(input: {
  serviceId: string;
  staffId: string | null;
  day: string; // yyyy-MM-dd
}): Promise<string[]> {
  const parsed = slotsSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid availability request.");
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_service_id: parsed.data.serviceId,
    p_staff_id: parsed.data.staffId,
    p_day: parsed.data.day,
  });
  // Throw on a real RPC failure so callers can tell "the lookup broke" apart
  // from "this day genuinely has no slots" (an empty array).
  if (error) {
    console.error("get_available_slots failed", error);
    throw new Error("Could not load availability.");
  }
  return (data ?? []).map((s) => s.starts_at);
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
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_day_availability", {
    p_service_id: parsed.data.serviceId,
    p_staff_id: parsed.data.staffId,
    p_from: parsed.data.from,
    p_days: parsed.data.days,
  });
  if (error) {
    console.error("get_day_availability failed", error);
    throw new Error("Could not load availability.");
  }
  return (data ?? []).map((s) => s.starts_at);
}

const contactSchema = z.object({
  appointmentId: id,
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().min(5, "Phone is required").max(40),
});

/** The booking, but only for the browser that holds its token. */
async function loadPayable(appointmentId: string) {
  const token = await getHoldToken(appointmentId);
  if (!token) return null;
  const { data, error } = await createAdminClient()
    .from("appointments")
    .select(
      "id, status, payment_status, price_cents, starts_at, customer_email, stripe_session_id, checkout_attempt, service:services(name)",
    )
    .eq("id", appointmentId)
    .eq("hold_token", token)
    .maybeSingle();
  if (error) console.error("loadPayable failed", error);
  return data
    ? { ...data, holdToken: token, payment_status: toPaymentStatus(data.payment_status) }
    : null;
}

const NOT_ACTIVE = "This booking is no longer active.";

/** Save the guest's contact details onto the held appointment (only while it is
 *  still unpaid — a settled booking's details are not rewritable). */
export async function saveGuestDetails(
  input: z.infer<typeof contactSchema>,
): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  const appt = await loadPayable(parsed.data.appointmentId);
  if (!appt || appt.status === "cancelled") return { ok: false, error: NOT_ACTIVE };
  if (appt.payment_status !== "unpaid") {
    return { ok: false, error: "This booking is already settled and can't be edited." };
  }

  const { error } = await createAdminClient()
    .from("appointments")
    .update({
      customer_name: parsed.data.name,
      customer_email: parsed.data.email,
      customer_phone: parsed.data.phone,
    })
    .eq("id", appt.id)
    .eq("hold_token", appt.holdToken)
    .eq("payment_status", "unpaid");

  if (error) {
    console.error("saveGuestDetails failed", error);
    return { ok: false, error: "Could not save your details." };
  }
  return { ok: true, data: undefined };
}

const PROCESSING = "Your payment is still processing. Check back in a few minutes.";
const CANCEL_RETRY = "Could not cancel right now. Try again.";

/** Close the booking's Checkout session with Stripe (expire it if still open)
 *  and report where it ended up:
 *   - paid:       money has moved (recorded via record_payment)
 *   - processing: the guest finished checkout but an async method is pending
 *   - closed:     no session, or it is expired / unusable — safe to move on
 *   - failed:     could not tell (Stripe down, expire raced); do not proceed */
async function settleSession(appt: {
  id: string;
  stripe_session_id: string | null;
}): Promise<"paid" | "processing" | "closed" | "failed"> {
  if (!appt.stripe_session_id) return "closed";
  if (!stripe) return "failed";
  try {
    let session = await stripe.checkout.sessions.retrieve(appt.stripe_session_id);
    if (session.status === "open") {
      try {
        session = await stripe.checkout.sessions.expire(appt.stripe_session_id);
      } catch (e) {
        // Most likely the guest completed payment a moment ago; look again.
        console.error("[stripe] expire failed, re-checking session", e);
        session = await stripe.checkout.sessions.retrieve(appt.stripe_session_id);
      }
    }
    if (session.payment_status === "paid") {
      if (typeof session.amount_total === "number") {
        await paymentStore.recordPayment({
          appointmentId: appt.id,
          sessionId: session.id,
          amountTotal: session.amount_total,
        });
      }
      return "paid";
    }
    if (session.status === "complete") return "processing";
    if (session.status === "open") return "failed";
    return "closed";
  } catch (e) {
    console.error("[stripe] could not settle the session", e);
    return "failed";
  }
}

/** Back out of a held booking before paying — frees the slot again.
 *
 *  A booking with a Checkout session may already be paid (or be paid a moment
 *  from now), so it is never deleted: the session is closed with Stripe first,
 *  and only then is the booking cancelled by `cancel_unpaid_booking`, which
 *  takes a row lock and refuses if a payment was recorded in the meantime. */
export async function abandonBooking(
  rawAppointmentId: string,
): Promise<ActionResult> {
  const parsedId = id.safeParse(rawAppointmentId);
  if (!parsedId.success) return { ok: false, error: "Invalid booking." };
  const appt = await loadPayable(parsedId.data);
  if (!appt) return { ok: true, data: undefined }; // nothing this browser can cancel
  if (appt.payment_status === "paid") {
    return { ok: false, error: "This booking is already paid." };
  }

  const settled = await settleSession(appt);
  if (settled === "paid") return { ok: false, error: "This booking was already paid." };
  if (settled === "processing") return { ok: false, error: PROCESSING };
  if (settled === "failed") return { ok: false, error: CANCEL_RETRY };

  const { data, error } = await createAdminClient().rpc("cancel_unpaid_booking", {
    p_appointment_id: appt.id,
    p_hold_token: appt.holdToken,
  });
  if (error) {
    console.error("cancel_unpaid_booking failed", error);
    return { ok: false, error: CANCEL_RETRY };
  }
  if (data === "paid") return { ok: false, error: "This booking was already paid." };
  if (data === "not_cancellable") {
    return { ok: false, error: "This booking can't be cancelled here." };
  }
  return { ok: true, data: undefined };
}

/** Choose to settle up at the salon. Any open Checkout session is expired
 *  first, so a card payment can't land on a booking that is now pay-at-salon. */
export async function payLater(
  rawAppointmentId: string,
): Promise<ActionResult> {
  const parsedId = id.safeParse(rawAppointmentId);
  if (!parsedId.success) return { ok: false, error: "Invalid booking." };
  const appt = await loadPayable(parsedId.data);
  if (!appt || appt.status === "cancelled") return { ok: false, error: NOT_ACTIVE };
  if (appt.payment_status === "paid") return { ok: true, data: undefined };

  const settled = await settleSession(appt);
  if (settled === "paid") return { ok: true, data: undefined }; // already paid by card
  if (settled === "processing") return { ok: false, error: PROCESSING };
  if (settled === "failed") return { ok: false, error: "Something went wrong. Try again." };

  const { error } = await createAdminClient()
    .from("appointments")
    .update({ payment_status: "pay_later" })
    .eq("id", appt.id)
    .eq("hold_token", appt.holdToken)
    .neq("payment_status", "paid");
  if (error) {
    console.error("payLater failed", error);
    return { ok: false, error: "Something went wrong. Try again." };
  }
  return { ok: true, data: undefined };
}

/** The public origin for Stripe's return URLs. In production it must be set
 *  explicitly (NEXT_PUBLIC_SITE_URL): the Host header is attacker-controlled
 *  and must not decide where a payment redirects. Null = fail closed. */
function siteOrigin(host: string | null): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      console.error("NEXT_PUBLIC_SITE_URL is not a valid URL");
      return null;
    }
  }
  if (process.env.NODE_ENV === "production") return null;
  if (host) return `http${host.startsWith("localhost") ? "" : "s"}://${host}`;
  return "http://localhost:3000";
}

// Stripe's minimum is 30 minutes from creation. expires_at is the end of the
// current bucket plus this, so it is always >= 31 minutes ahead.
const CHECKOUT_TTL_S = 31 * 60;
const CHECKOUT_BUCKET_S = 5 * 60;

/** Create (or reuse) a Stripe Checkout session for the full service price. */
export async function startCheckout(
  rawAppointmentId: string,
): Promise<ActionResult<{ url: string }>> {
  if (!stripe) return { ok: false, error: "Card payments aren't set up yet." };
  const parsedId = id.safeParse(rawAppointmentId);
  if (!parsedId.success) return { ok: false, error: "Invalid booking." };

  const appt = await loadPayable(parsedId.data);
  if (!appt || appt.status === "cancelled") return { ok: false, error: NOT_ACTIVE };
  if (appt.payment_status === "paid") {
    return { ok: false, error: "This booking is already paid." };
  }

  const origin = siteOrigin((await headers()).get("host"));
  if (!origin) {
    console.error("startCheckout: NEXT_PUBLIC_SITE_URL is not set (or invalid) in production");
    return { ok: false, error: "Card payments aren't available right now." };
  }

  const supabase = createAdminClient();
  try {
    // Reuse a session that is still open (double click, back button, retry)
    // instead of stacking up parallel ones.
    if (appt.stripe_session_id) {
      const existing = await stripe.checkout.sessions.retrieve(appt.stripe_session_id);
      if (existing.payment_status === "paid") {
        if (typeof existing.amount_total === "number") {
          await paymentStore.recordPayment({
            appointmentId: appt.id,
            sessionId: existing.id,
            amountTotal: existing.amount_total,
          });
        }
        return { ok: false, error: "This booking is already paid." };
      }
      if (existing.status === "open" && existing.url) {
        return { ok: true, data: { url: existing.url } };
      }
      if (existing.status === "complete") {
        // Async payment method still pending: don't stack a second session.
        return { ok: false, error: PROCESSING };
      }
    }

    // The reuse check above plus the row lock in the database are the primary
    // de-dup. The idempotency key only collapses true concurrent duplicates: it is
    // built from stable inputs (booking, email, price), the per-attempt counter
    // (bumped whenever a session is released) and a 5-minute bucket. expires_at is
    // derived from that same bucket, so two calls with the same key send identical
    // parameters (a different value would make Stripe answer idempotency_error),
    // and a retry in a later bucket or after a release gets a fresh key.
    const bucket = Math.floor(Date.now() / 1000 / CHECKOUT_BUCKET_S);
    const expiresAt = (bucket + 1) * CHECKOUT_BUCKET_S + CHECKOUT_TTL_S;
    const idempotencyKey = createHash("sha256")
      .update(
        [appt.id, appt.customer_email ?? "", appt.price_cents, appt.checkout_attempt, bucket].join("|"),
      )
      .digest("hex");

    // Re-verify under the token right before creating the session: the sweeper
    // may have removed a stale hold, or a payment may have landed.
    const { data: still, error: stillError } = await supabase
      .from("appointments")
      .select("id")
      .eq("id", appt.id)
      .eq("hold_token", appt.holdToken)
      .eq("status", "confirmed")
      .eq("payment_status", "unpaid")
      .maybeSingle();
    if (stillError) throw new Error(stillError.message);
    if (!still) return { ok: false, error: NOT_ACTIVE };

    const session = await stripe.checkout.sessions.create(
      {
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
        expires_at: expiresAt,
        // The webhook is the source of truth; the confirmation page also
        // reconciles this session on return as a fast path.
        success_url: `${origin}/book/confirmation/${appt.id}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/book/pay/${appt.id}`,
      },
      { idempotencyKey },
    );

    if (!session.url) {
      console.error("startCheckout: Stripe returned a session without a url", session.id);
      return { ok: false, error: "Could not start checkout." };
    }

    const { data: stored, error } = await supabase
      .from("appointments")
      .update({
        stripe_session_id: session.id,
        stripe_session_expires_at: new Date(session.expires_at * 1000).toISOString(),
      })
      .eq("id", appt.id)
      .eq("hold_token", appt.holdToken)
      .eq("status", "confirmed")
      .eq("payment_status", "unpaid")
      .select("id");
    if (error || !stored || stored.length === 0) {
      // An unrecorded session could be paid but never matched to the booking
      // (a 0-row update means the hold vanished or was settled meanwhile).
      console.error("startCheckout: could not store the session id", error ?? "no row updated");
      await stripe.checkout.sessions.expire(session.id).catch((e: unknown) => {
        console.error("[stripe] expire after failed save also failed", e);
      });
      return { ok: false, error: "Could not start checkout. Please try again." };
    }

    return { ok: true, data: { url: session.url } };
  } catch (e) {
    // Logged with Stripe's own type/code so a bad amount, a bad key and an
    // outage can be told apart in the server logs; the guest gets one message.
    const err = e as { type?: string; code?: string; message?: string };
    console.error("startCheckout failed", { type: err.type, code: err.code, message: err.message });
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}

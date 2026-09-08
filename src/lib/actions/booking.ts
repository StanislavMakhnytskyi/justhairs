"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { createAdminClient, createPublicClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { formatDateTime } from "@/lib/format";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const bookSchema = z.object({
  serviceId: z.string().uuid(),
  staffId: z.string().uuid().nullable(),
  startsAt: z.string().datetime({ offset: true }),
});

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
    p_starts_at: parsed.data.startsAt,
  });

  if (error) {
    return {
      ok: false,
      error: error.message.includes("no longer available")
        ? "That time was just taken. Pick another slot."
        : "Could not create the booking. Please try again.",
    };
  }

  const row = data as { id: string; confirmation_code: string | null };
  return { ok: true, data: { id: row.id, code: row.confirmation_code ?? "" } };
}

export async function getAvailableSlots(input: {
  serviceId: string;
  staffId: string | null;
  day: string; // yyyy-MM-dd
}): Promise<string[]> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_service_id: input.serviceId,
    p_staff_id: input.staffId,
    p_day: input.day,
  });
  // Throw on a real RPC failure so callers can tell "the lookup broke" apart
  // from "this day genuinely has no slots" (an empty array).
  if (error) throw new Error(error.message || "Could not load availability.");
  if (!data) return [];
  return (data as { starts_at: string }[]).map((s) => s.starts_at);
}

const contactSchema = z.object({
  appointmentId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  phone: z.string().trim().min(5, "Phone is required").max(40),
});

async function loadPayable(appointmentId: string) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("appointments")
    .select("id, status, payment_status, price_cents, starts_at, service:services(name)")
    .eq("id", appointmentId)
    .maybeSingle();
  return data as
    | {
        id: string;
        status: string;
        payment_status: string;
        price_cents: number;
        starts_at: string;
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
      success_url: `${origin}/book/confirmation/${appt.id}?paid=1`,
      cancel_url: `${origin}/book/pay/${appt.id}`,
    });

    if (!session.url) return { ok: false, error: "Could not start checkout." };

    await createAdminClient()
      .from("appointments")
      .update({ stripe_session_id: session.id })
      .eq("id", appt.id);

    return { ok: true, data: { url: session.url } };
  } catch {
    return { ok: false, error: "Could not start checkout. Please try again." };
  }
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getHoldToken } from "@/lib/hold-token";
import { getAppointment, reconcileCheckout } from "@/lib/appointments";
import { ConfirmationCard, type Outcome } from "./ConfirmationCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your booking",
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!z.guid().safeParse(id).success) notFound();
  const holdToken = await getHoldToken(id);
  if (!holdToken) notFound();

  // Back from Stripe Checkout — verify the booking's STORED session (never a
  // session id from the URL) and mark the row paid (the webhook does the same;
  // this is the fast path). Only for the browser that holds the hold token.
  let appt = await getAppointment(id, holdToken);
  let reconciled: "paid" | "pending" | "noop" = "noop";
  if (appt && appt.payment_status === "unpaid" && appt.stripe_session_id) {
    reconciled = await reconcileCheckout(id, appt.stripe_session_id);
    if (reconciled === "paid") appt = await getAppointment(id, holdToken);
  }
  if (!appt || appt.status === "cancelled") notFound();

  const outcome: Outcome =
    appt.payment_status === "paid"
      ? "paid"
      : appt.payment_status === "pay_later"
        ? "pay_later"
        : appt.stripe_session_id && reconciled === "pending"
          ? "confirming"
          : "unpaid";

  return (
    <ConfirmationCard
      outcome={outcome}
      appt={{
        id: appt.id,
        serviceName: appt.service.name,
        staffName: appt.staff?.name ?? null,
        startsAt: appt.starts_at,
        durationMin: appt.service.duration_min,
        priceCents: appt.price_cents,
        confirmationCode: appt.confirmation_code,
      }}
    />
  );
}

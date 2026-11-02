import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { BookShell } from "@/components/ticket/BookShell";
import { SummaryList, SummaryRow } from "@/components/ui/SummaryList";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { SALON_TZ } from "@/lib/salon";
import { getAppointment, reconcileCheckout } from "@/lib/appointments";
import { getHoldToken } from "@/lib/hold-token";
import { PayForm } from "./PayForm";
import { PayTopBar } from "./PayTopBar";
import { HoldNotice } from "./HoldNotice";

export const dynamic = "force-dynamic";

/** Unpaid holds without a Checkout session are swept after this (0009). */
const HOLD_MINUTES = 30;

/** The "use card 4242…" hint. NEXT_PUBLIC_DEMO=1/true shows it, 0/false hides
 *  it; unset, it shows everywhere except a production build. */
function showTestCard(): boolean {
  const flag = process.env.NEXT_PUBLIC_DEMO?.trim().toLowerCase();
  if (flag) return flag === "1" || flag === "true";
  return process.env.NODE_ENV !== "production";
}

export const metadata: Metadata = {
  title: "Pay for your booking",
  robots: { index: false, follow: false },
};

export default async function PayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // Bad ids and visitors without this booking's cookie never reach the database.
  if (!z.guid().safeParse(id).success) notFound();
  const appt = await getAppointment(id, await getHoldToken(id));
  if (!appt) notFound();
  if (appt.status === "cancelled") notFound();

  // Already settled (or chosen to pay later) — nothing to do here.
  if (appt.payment_status !== "unpaid") redirect(`/book/confirmation/${id}`);

  // Paid in Stripe but the webhook / return page hasn't recorded it yet (e.g. the
  // guest hit Back from Checkout): settle it from the STORED session id, then
  // show the confirmation instead of a pay form for a paid booking.
  if (appt.stripe_session_id) {
    if ((await reconcileCheckout(id, appt.stripe_session_id)) === "paid") {
      redirect(`/book/confirmation/${id}`);
    }
  }

  const day = new Date(appt.starts_at).toLocaleDateString("en-CA", {
    timeZone: SALON_TZ,
  });
  const backHref =
    `/book?service=${encodeURIComponent(appt.service.slug)}` +
    `&staff=${appt.staff_id ?? "any"}` +
    `&date=${day}&time=${encodeURIComponent(appt.starts_at)}&step=review`;

  // How long the slot stays held (migration 0009's release_stale_holds): a
  // hold with no Checkout session is swept 30 minutes after it was created;
  // once a session exists the hold lasts while that session is open. Past
  // that, Stripe is about to expire the session and the hold is released.
  const holdUntil = appt.stripe_session_id
    ? appt.stripe_session_expires_at
    : new Date(Date.parse(appt.created_at) + HOLD_MINUTES * 60_000).toISOString();

  return (
    <BookShell>
      <PayTopBar appointmentId={appt.id} backHref={backHref} />
      <div className="flex flex-1 flex-col gap-6 px-gutter pb-8 pt-6">
        {holdUntil && <HoldNotice until={holdUntil} />}
        <SummaryList>
          <SummaryRow label="Service" value={appt.service.name} />
          <SummaryRow label="Specialist" value={appt.staff?.name ?? "Any specialist"} />
          <SummaryRow label="When" value={formatDateTime(appt.starts_at)} />
          <SummaryRow label="Duration" value={formatDuration(appt.service.duration_min)} />
          <SummaryRow label="Total" value={formatPrice(appt.price_cents)} strong />
        </SummaryList>

        <div className="cut -mx-gutter" aria-hidden />

        <PayForm
          appointmentId={appt.id}
          priceLabel={formatPrice(appt.price_cents)}
          showTestCard={showTestCard()}
        />
      </div>
    </BookShell>
  );
}

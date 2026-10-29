import { notFound } from "next/navigation";
import { BookShell } from "@/components/ticket/BookShell";
import { Button } from "@/components/ui/Button";
import { SummaryRow } from "@/components/ui/SummaryList";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { getAppointment, reconcileCheckout } from "@/lib/appointments";

export const dynamic = "force-dynamic";

export default async function ConfirmationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const [{ id }, { session_id }] = await Promise.all([params, searchParams]);

  // Back from Stripe Checkout — verify the session and mark the row paid.
  if (session_id) await reconcileCheckout(id, session_id);

  const appt = await getAppointment(id);
  if (!appt) notFound();

  const payLine =
    appt.payment_status === "paid"
      ? "Paid in full"
      : appt.payment_status === "pay_later"
        ? "Pay after your visit"
        : "Payment not completed";

  return (
    <BookShell>
      <div className="flex flex-1 flex-col px-gutter pb-8 pt-10 text-center">
        <p className="text-label font-bold uppercase tracking-[0.14em] text-text-secondary">
          Appointment card
        </p>
        <h1 className="mt-3 text-display text-text-primary">You&rsquo;re booked</h1>
        <p className="mx-auto mt-2 max-w-[34ch] text-body text-text-secondary">
          {appt.customer_email
            ? `A confirmation is on its way to ${appt.customer_email}.`
            : "Your appointment is confirmed."}
        </p>

        <div className="mt-8 flex flex-col gap-5 text-left">
          <SummaryRow label="Service" value={appt.service.name} />
          <SummaryRow label="Specialist" value={appt.staff?.name ?? "Any specialist"} />
          <SummaryRow label="When" value={formatDateTime(appt.starts_at)} />
          <SummaryRow label="Duration" value={formatDuration(appt.service.duration_min)} />
          <SummaryRow label="Total" value={formatPrice(appt.price_cents)} strong />
          <p className="text-label text-text-secondary">{payLine}</p>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          {appt.payment_status === "unpaid" && (
            <Button href={`/book/pay/${appt.id}`} block>
              Complete payment
            </Button>
          )}
          <Button
            href="/"
            variant={appt.payment_status === "unpaid" ? "text" : "primary"}
            block
          >
            Back to home
          </Button>
          {/* TODO (CODE_REVIEW.md #14): this is deliberate, not a gap —
              reschedule_appointment/cancel_appointment were dropped with the
              rest of the auth surface in migration 0003 and never replaced. */}
          <p className="mt-4 text-caption text-text-secondary">
            Need to change or cancel? Call the salon and quote your code.
          </p>
        </div>
      </div>

      {/* The tear-off stub: the code is the part the guest keeps. */}
      <div className="mt-auto bg-surface-card">
        <div className="cut" aria-hidden />
        <div className="relative flex items-center justify-between gap-4 px-gutter py-5">
          <div>
            <p className="text-caption text-text-secondary">Confirmation code</p>
            <p className="text-display tabular-nums tracking-[0.18em] text-text-primary">
              {appt.confirmation_code ?? "—"}
            </p>
          </div>
          <span
            aria-hidden
            className="grid size-16 shrink-0 -rotate-6 place-items-center rounded-full border-4 border-double border-success text-center text-caption font-bold uppercase leading-tight tracking-wider text-success motion-safe:animate-stamp"
          >
            {appt.payment_status === "paid" ? "Paid" : "Booked"}
          </span>
        </div>
      </div>
    </BookShell>
  );
}

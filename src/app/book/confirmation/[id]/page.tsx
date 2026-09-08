import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/primitives";
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
    <AppShell className="items-center justify-center px-gutter py-12 text-center">
      <CheckCircle2 size={56} className="text-success" />
      <h1 className="mt-4 text-title text-text-primary">You&rsquo;re booked</h1>
      <p className="mt-1 text-body text-text-secondary">
        {appt.customer_email
          ? `A confirmation is on its way to ${appt.customer_email}.`
          : "Your appointment is confirmed."}
      </p>

      <div className="mt-6 w-full rounded-[var(--radius-md)] bg-surface-card p-4 text-left shadow-[var(--shadow-card)]">
        {appt.confirmation_code && (
          <>
            <p className="text-caption text-text-secondary">Confirmation code</p>
            <p className="text-heading tracking-[0.2em] text-text-primary">
              {appt.confirmation_code}
            </p>
            <Divider className="my-3" />
          </>
        )}
        <p className="text-subhead text-text-primary">{appt.service.name}</p>
        <p className="text-label text-text-secondary">
          {appt.staff?.name ?? "Any specialist"}
        </p>
        <Divider className="my-3" />
        <p className="text-body text-text-primary">{formatDateTime(appt.starts_at)}</p>
        <p className="text-label text-text-secondary">
          {formatDuration(appt.service.duration_min)} ·{" "}
          {formatPrice(appt.price_cents)} — {payLine}
        </p>
      </div>

      <div className="mt-6 flex w-full flex-col gap-2">
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
      </div>

      <p className="mt-6 text-caption text-text-secondary">
        Need to change or cancel? Call the salon and quote your code.
      </p>
    </AppShell>
  );
}

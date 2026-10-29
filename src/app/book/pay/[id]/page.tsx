import { notFound, redirect } from "next/navigation";
import { BookShell } from "@/components/ticket/BookShell";
import { SummaryList, SummaryRow } from "@/components/ui/SummaryList";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { SALON_TZ } from "@/lib/salon";
import { getAppointment } from "@/lib/appointments";
import { PayForm } from "./PayForm";
import { PayTopBar } from "./PayTopBar";

export const dynamic = "force-dynamic";

export default async function PayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appt = await getAppointment(id);
  if (!appt) notFound();
  if (appt.status === "cancelled") notFound();

  // Already settled (or chosen to pay later) — nothing to do here.
  if (appt.payment_status !== "unpaid") redirect(`/book/confirmation/${id}`);

  const day = new Date(appt.starts_at).toLocaleDateString("en-CA", {
    timeZone: SALON_TZ,
  });
  const backHref =
    `/book?service=${encodeURIComponent(appt.service.slug)}` +
    `&staff=${appt.staff_id ?? "any"}` +
    `&date=${day}&time=${encodeURIComponent(appt.starts_at)}&step=review`;

  return (
    <BookShell>
      <PayTopBar appointmentId={appt.id} backHref={backHref} />
      <div className="flex flex-1 flex-col gap-6 px-gutter pb-8 pt-6">
        <SummaryList>
          <SummaryRow label="Service" value={appt.service.name} />
          <SummaryRow label="Specialist" value={appt.staff?.name ?? "Any specialist"} />
          <SummaryRow label="When" value={formatDateTime(appt.starts_at)} />
          <SummaryRow label="Duration" value={formatDuration(appt.service.duration_min)} />
          <SummaryRow label="Total" value={formatPrice(appt.price_cents)} strong />
        </SummaryList>

        <div className="cut -mx-gutter" aria-hidden />

        <PayForm appointmentId={appt.id} priceLabel={formatPrice(appt.price_cents)} />
      </div>
    </BookShell>
  );
}

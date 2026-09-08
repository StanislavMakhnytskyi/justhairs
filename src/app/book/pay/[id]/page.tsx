import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { SummaryList, SummaryRow } from "@/components/ui/SummaryList";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { getAppointment } from "@/lib/appointments";
import { PayForm } from "./PayForm";

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

  return (
    <AppShell>
      <TopBar title="Almost done" />
      <div className="flex flex-col gap-6 px-gutter pb-10 pt-2">
        <SummaryList>
          <SummaryRow label="Service" value={appt.service.name} />
          <SummaryRow label="Specialist" value={appt.staff?.name ?? "Any specialist"} />
          <SummaryRow label="When" value={formatDateTime(appt.starts_at)} />
          <SummaryRow label="Duration" value={formatDuration(appt.service.duration_min)} />
          <SummaryRow label="Total" value={formatPrice(appt.price_cents)} strong />
        </SummaryList>

        <PayForm
          appointmentId={appt.id}
          priceLabel={formatPrice(appt.price_cents)}
        />
      </div>
    </AppShell>
  );
}

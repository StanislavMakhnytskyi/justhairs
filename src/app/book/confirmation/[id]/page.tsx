import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Divider } from "@/components/ui/primitives";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { getAppointment } from "@/lib/appointments";

export default async function ConfirmationPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appt = await getAppointment(id);
  if (!appt) notFound();

  const when = formatDateTime(appt.starts_at);

  return (
    <AppShell className="items-center justify-center px-6 py-12 text-center">
      <CheckCircle2 size={56} className="text-success" />
      <h1 className="mt-4 text-[24px] font-bold tracking-tight text-text-primary">
        You&rsquo;re booked
      </h1>
      <p className="mt-1 text-[14px] text-text-secondary">
        A confirmation is on its way to your inbox.
      </p>

      <div className="mt-6 w-full rounded-[var(--radius-md)] bg-surface-card p-4 text-left shadow-[var(--shadow-card)]">
        <p className="text-[16px] font-bold text-text-primary">{appt.service.name}</p>
        <p className="text-[13px] text-text-secondary">
          {appt.staff?.name ?? "Any specialist"}
        </p>
        <Divider className="my-3" />
        <p className="text-[14px] text-text-primary">{when}</p>
        <p className="text-[13px] text-text-secondary">
          {formatDuration(appt.service.duration_min)} · {formatPrice(appt.price_cents)} —
          pay after your visit
        </p>
      </div>

      <div className="mt-6 flex w-full flex-col gap-2">
        <Button href="/account" block>
          Go to my appointments
        </Button>
        <Button href="/" variant="text" block>
          Back to home
        </Button>
      </div>
    </AppShell>
  );
}

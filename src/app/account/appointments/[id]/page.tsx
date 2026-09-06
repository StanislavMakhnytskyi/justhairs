import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { Divider } from "@/components/ui/primitives";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { getAppointment } from "@/lib/appointments";
import { AppointmentActions } from "./AppointmentActions";

export default async function AppointmentDetailPage({
  params,
}: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appt = await getAppointment(id);
  if (!appt) notFound();

  const when = formatDateTime(appt.starts_at);
  const canManage = appt.status === "confirmed" || appt.status === "pending";

  return (
    <div>
      <TopBar title="Appointment" />
      <div className="p-6">
        <div className="rounded-[var(--radius-md)] bg-surface-card p-4 shadow-[var(--shadow-card)]">
          <p className="text-[19px] font-bold text-text-primary">{appt.service.name}</p>
          <p className="text-[13px] text-text-secondary">
            {appt.staff?.name ?? "Any specialist"}
          </p>
          <Divider className="my-3" />
          <p className="text-[15px] text-text-primary">{when}</p>
          <p className="text-[13px] text-text-secondary">
            {formatDuration(appt.service.duration_min)} ·{" "}
            {formatPrice(appt.price_cents)} — pay after your visit
          </p>
        </div>

        <p className="mt-4 text-[12px] text-text-secondary">
          Free cancellation up to 24 hours before your appointment. After that a €20
          cancellation fee applies.
        </p>

        {canManage && (
          <AppointmentActions
            appointmentId={appt.id}
            serviceId={appt.service.id}
            currentStaffId={appt.staff?.id ?? null}
          />
        )}
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { Card } from "@/components/ui/primitives";
import { SummaryList, SummaryRow } from "@/components/ui/SummaryList";
import { StarRating } from "@/components/ui/StarRating";
import { ReviewPrompt } from "@/components/reviews/ReviewPrompt";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { getAppointment } from "@/lib/appointments";
import { getOpenWeekdays } from "@/lib/queries";
import { AppointmentActions } from "./AppointmentActions";

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [appt, openWeekdays] = await Promise.all([
    getAppointment(id),
    getOpenWeekdays(),
  ]);
  if (!appt) notFound();

  const canManage = appt.status === "confirmed" || appt.status === "pending";

  return (
    <div>
      <TopBar title="Appointment" />
      <div className="p-gutter">
        <SummaryList
          footnote="Free cancellation up to 24 hours before your appointment. After that a €20 cancellation fee applies."
        >
          <SummaryRow label="Service" value={appt.service.name} />
          <SummaryRow
            label="Specialist"
            value={appt.staff?.name ?? "Any specialist"}
          />
          <SummaryRow label="When" value={formatDateTime(appt.starts_at)} />
          <SummaryRow
            label="Duration"
            value={formatDuration(appt.service.duration_min)}
          />
          <SummaryRow
            label="Total"
            value={`${formatPrice(appt.price_cents)} — pay after visit`}
          />
        </SummaryList>

        {canManage && (
          <AppointmentActions
            appointmentId={appt.id}
            serviceId={appt.service.id}
            currentStaffId={appt.staff?.id ?? null}
            openWeekdays={openWeekdays}
          />
        )}

        {appt.status === "completed" && !appt.review && (
          <ReviewPrompt appointmentId={appt.id} serviceName={appt.service.name} />
        )}

        {appt.review && (
          <Card className="mt-4">
            <p className="text-subhead text-text-primary">Your review</p>
            <StarRating value={appt.review.rating} className="mt-1" />
            {appt.review.comment && (
              <p className="mt-2 text-body text-text-primary">
                &ldquo;{appt.review.comment}&rdquo;
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}

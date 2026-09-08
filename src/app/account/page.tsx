import Link from "next/link";
import { isAfter } from "date-fns";
import { Button } from "@/components/ui/Button";
import { AppointmentCard } from "@/components/ui/AppointmentCard";
import { EmptyState, SectionHeader } from "@/components/ui/primitives";
import { ReviewPrompt } from "@/components/reviews/ReviewPrompt";
import { listMyAppointments } from "@/lib/appointments";
import { getCurrentProfile } from "@/lib/queries";

export default async function DashboardPage() {
  const [profile, appointments] = await Promise.all([
    getCurrentProfile(),
    listMyAppointments(),
  ]);

  const now = new Date();
  const upcoming = appointments.filter(
    (a) =>
      (a.status === "confirmed" || a.status === "pending") &&
      isAfter(new Date(a.starts_at), now),
  );
  const next = upcoming[0];
  const toReview = appointments.filter((a) => a.status === "completed" && !a.review);

  return (
    <div className="p-gutter">
      <h1 className="text-title text-text-primary">
        Hi{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
      </h1>

      <div className="mt-6">
        <SectionHeader
          title="Next appointment"
          action={
            <Link href="/account/appointments" className="text-label font-bold text-link">
              All
            </Link>
          }
        />
        {next ? (
          <AppointmentCard appt={next} />
        ) : (
          <EmptyState
            title="Nothing booked yet"
            description="Book a haircut, colour or styling session."
            action={
              <Button href="/book" size="md">
                Book appointment
              </Button>
            }
          />
        )}
      </div>

      {toReview.length > 0 && (
        <div className="mt-8">
          <SectionHeader title="Rate your last visit" />
          <ReviewPrompt
            appointmentId={toReview[0].id}
            serviceName={toReview[0].service.name}
          />
        </div>
      )}

      {upcoming.length > 1 && (
        <div className="mt-8">
          <SectionHeader title="Later" />
          <div className="flex flex-col gap-2">
            {upcoming.slice(1).map((a) => (
              <AppointmentCard key={a.id} appt={a} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

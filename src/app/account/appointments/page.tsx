import { isAfter } from "date-fns";
import { TopBar } from "@/components/ui/TopBar";
import { AppointmentCard } from "@/components/ui/AppointmentCard";
import { EmptyState } from "@/components/ui/primitives";
import { listMyAppointments } from "@/lib/appointments";
import { AppointmentsTabs } from "./AppointmentsTabs";

export default async function AppointmentsPage() {
  const all = await listMyAppointments();
  const now = new Date();

  const upcoming = all.filter(
    (a) =>
      (a.status === "confirmed" || a.status === "pending") &&
      isAfter(new Date(a.starts_at), now),
  );
  const past = all
    .filter(
      (a) =>
        a.status === "completed" ||
        ((a.status === "confirmed" || a.status === "pending") &&
          !isAfter(new Date(a.starts_at), now)),
    )
    .reverse();
  const cancelled = all
    .filter((a) => a.status === "cancelled" || a.status === "no_show")
    .reverse();

  const render = (list: typeof all, empty: string) =>
    list.length ? (
      <div className="flex flex-col gap-2">
        {list.map((a) => (
          <AppointmentCard key={a.id} appt={a} />
        ))}
      </div>
    ) : (
      <EmptyState title={empty} />
    );

  return (
    <div>
      <TopBar title="My appointments" />
      <div className="p-gutter">
        <AppointmentsTabs
          upcoming={render(upcoming, "No upcoming appointments")}
          past={render(past, "No past visits yet")}
          cancelled={render(cancelled, "Nothing cancelled")}
        />
      </div>
    </div>
  );
}

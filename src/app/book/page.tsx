import { Suspense } from "react";
import { BookingFlow } from "./BookingFlow";
import { BookingFlowSkeleton } from "./BookingFlowSkeleton";
import { getCatalog, getCurrentProfile } from "@/lib/queries";

export default async function BookPage() {
  const [{ services, staff, staffServices, workingHours }, profile] = await Promise.all([
    getCatalog(),
    getCurrentProfile(),
  ]);

  const openWeekdays = [...new Set(workingHours.map((h) => h.weekday))];

  return (
    <Suspense fallback={<BookingFlowSkeleton />}>
      <BookingFlow
        services={services}
        staff={staff}
        staffServices={staffServices}
        openWeekdays={openWeekdays.length ? openWeekdays : [2, 3, 4, 5, 6]}
        isAuthed={!!profile}
      />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingFlow } from "./BookingFlow";
import { BookingFlowSkeleton } from "./BookingFlowSkeleton";
import { getCatalog } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Pick a service, a specialist and a time at justhairs.",
  alternates: { canonical: "/book" },
};

export default async function BookPage() {
  const { services, staff, staffServices, workingHours } = await getCatalog();

  const openWeekdays = [...new Set(workingHours.map((h) => h.weekday))];

  return (
    <Suspense fallback={<BookingFlowSkeleton />}>
      <BookingFlow
        services={services}
        staff={staff}
        staffServices={staffServices}
        openWeekdays={openWeekdays.length ? openWeekdays : [2, 3, 4, 5, 6]}
      />
    </Suspense>
  );
}

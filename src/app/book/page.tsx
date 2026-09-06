import { Suspense } from "react";
import { BookingFlow } from "./BookingFlow";
import { getCatalog, getCurrentProfile } from "@/lib/queries";

export default async function BookPage() {
  const [{ services, staff, staffServices }, profile] = await Promise.all([
    getCatalog(),
    getCurrentProfile(),
  ]);

  return (
    <Suspense fallback={null}>
      <BookingFlow
        services={services}
        staff={staff}
        staffServices={staffServices}
        isAuthed={!!profile}
      />
    </Suspense>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { abandonBooking } from "@/lib/actions/booking";

/** Back from the payment page = "I want to change this booking": release the
 *  held slot and return to the review step. */
export function PayTopBar({
  appointmentId,
  backHref,
}: {
  appointmentId: string;
  backHref: string;
}) {
  const router = useRouter();
  const [leaving, start] = useTransition();

  return (
    <TopBar
      title={leaving ? "Going back…" : "Almost done"}
      onBack={() =>
        start(async () => {
          await abandonBooking(appointmentId);
          router.push(backHref);
        })
      }
    />
  );
}

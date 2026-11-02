"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/ui/TopBar";
import { abandonBooking } from "@/lib/actions/booking";
import { UNREACHABLE, clearGuestDraft } from "./messages";

/** Back from the payment page = "I want to change this booking": release the
 *  held slot and return to the review step. If the release fails (network, or
 *  the server refuses — e.g. it was paid meanwhile) the guest stays here and is
 *  told why, instead of the arrow silently doing nothing (CODE_REVIEW.md #17). */
export function PayTopBar({
  appointmentId,
  backHref,
}: {
  appointmentId: string;
  backHref: string;
}) {
  const router = useRouter();
  const [leaving, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <TopBar
        title={leaving ? "Going back…" : "Almost done"}
        onBack={() => {
          if (leaving) return;
          setError(null);
          start(async () => {
            try {
              const res = await abandonBooking(appointmentId);
              if (res.ok) {
                clearGuestDraft(appointmentId);
                router.push(backHref);
              }
              else setError(res.error);
            } catch {
              setError(UNREACHABLE);
            }
          });
        }}
      />
      {error && (
        <p role="alert" className="px-gutter pt-4 text-label font-medium text-error">
          {error}
        </p>
      )}
    </>
  );
}

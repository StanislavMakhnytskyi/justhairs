"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

const PENDING_KEY = "justhairs:pending-booking";

function hasPending() {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    if (!raw) return false;
    const p = JSON.parse(raw);
    return Boolean(p?.service && p?.time);
  } catch {
    return false;
  }
}

/**
 * Shown after sign-in when the user had a booking in progress — a safety net for
 * when the auth round-trip lands them somewhere other than the review step.
 */
export function ResumeBooking() {
  const router = useRouter();
  const show = useSyncExternalStore(
    () => () => {},
    hasPending,
    () => false,
  );

  if (!show) return null;

  return (
    <div className="mx-6 mt-6 flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-brand-subtle px-4 py-3">
      <p className="text-[13px] font-bold text-brand">You have a booking to finish</p>
      <Button size="sm" onClick={() => router.push("/book")}>
        Continue
      </Button>
    </div>
  );
}

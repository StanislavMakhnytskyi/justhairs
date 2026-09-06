"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { DateStrip } from "@/components/ui/DateStrip";
import { SlotGrid } from "@/components/ui/SlotGrid";
import {
  cancelAppointment,
  getAvailableSlots,
  rescheduleAppointment,
} from "@/lib/actions/booking";

export function AppointmentActions({
  appointmentId,
  serviceId,
  currentStaffId,
}: {
  appointmentId: string;
  serviceId: string;
  currentStaffId: string | null;
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"none" | "reschedule" | "cancel">("none");
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function pickDate(d: Date) {
    setDate(d);
    setTime(null);
    const day = format(d, "yyyy-MM-dd");
    start(async () => {
      setSlots(await getAvailableSlots({ serviceId, staffId: currentStaffId, day }));
    });
  }

  function submitReschedule() {
    if (!time) return;
    setError(null);
    start(async () => {
      const res = await rescheduleAppointment({
        appointmentId,
        staffId: currentStaffId,
        startsAt: time,
      });
      if (res.ok) {
        setSheet("none");
        router.refresh();
      } else setError(res.error);
    });
  }

  function submitCancel() {
    setError(null);
    start(async () => {
      const res = await cancelAppointment({ appointmentId });
      if (res.ok) {
        setSheet("none");
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <>
      <div className="mt-6 flex flex-col gap-2">
        <Button variant="outlined" block onClick={() => setSheet("reschedule")}>
          Reschedule
        </Button>
        <Button variant="text" block onClick={() => setSheet("cancel")}>
          Cancel appointment
        </Button>
      </div>

      <BottomSheet
        open={sheet === "reschedule"}
        onClose={() => setSheet("none")}
        title="Pick a new time"
      >
        <DateStrip value={date} onChange={pickDate} />
        <div className="mt-4">
          {date ? (
            <SlotGrid slots={slots} value={time} onChange={setTime} />
          ) : (
            <p className="text-[13px] text-text-secondary">Choose a day.</p>
          )}
        </div>
        {error && <p className="mt-3 text-[13px] text-error">{error}</p>}
        <Button
          block
          className="mt-4"
          disabled={!time || pending}
          onClick={submitReschedule}
        >
          Confirm new time
        </Button>
      </BottomSheet>

      <BottomSheet
        open={sheet === "cancel"}
        onClose={() => setSheet("none")}
        title="Cancel this appointment?"
      >
        <p className="text-[14px] text-text-secondary">
          You can rebook any time. If you&rsquo;re within 24 hours of the appointment a
          €20 fee may apply.
        </p>
        {error && <p className="mt-3 text-[13px] text-error">{error}</p>}
        <div className="mt-4 flex flex-col gap-2">
          <Button variant="primary" block disabled={pending} onClick={submitCancel}>
            Yes, cancel it
          </Button>
          <Button variant="text" block onClick={() => setSheet("none")}>
            Keep appointment
          </Button>
        </div>
      </BottomSheet>
    </>
  );
}

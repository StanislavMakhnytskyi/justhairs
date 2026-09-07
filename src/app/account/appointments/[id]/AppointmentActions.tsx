"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Button } from "@/components/ui/Button";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Stack } from "@/components/ui/Section";
import { Hint } from "@/components/ui/Hint";
import { DateStrip } from "@/components/ui/DateStrip";
import { SlotGrid } from "@/components/ui/SlotGrid";
import { dayTimeGrid } from "@/lib/salon";
import {
  cancelAppointment,
  getAvailableSlots,
  rescheduleAppointment,
} from "@/lib/actions/booking";

export function AppointmentActions({
  appointmentId,
  serviceId,
  currentStaffId,
  openWeekdays,
}: {
  appointmentId: string;
  serviceId: string;
  currentStaffId: string | null;
  openWeekdays: number[];
}) {
  const router = useRouter();
  const [sheet, setSheet] = useState<"none" | "reschedule" | "cancel">("none");
  const [date, setDate] = useState<Date | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const dayTimes = useMemo(
    () => (date ? dayTimeGrid(format(date, "yyyy-MM-dd")) : []),
    [date],
  );
  const availableSet = useMemo(
    () => new Set(slots.map((s) => new Date(s).getTime())),
    [slots],
  );

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
        startsAt: new Date(time).toISOString(),
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
      <Stack gap="sm" className="mt-6">
        <Button variant="outlined" block onClick={() => setSheet("reschedule")}>
          Reschedule
        </Button>
        <Button variant="text" block onClick={() => setSheet("cancel")}>
          Cancel appointment
        </Button>
      </Stack>

      <BottomSheet
        open={sheet === "reschedule"}
        onClose={() => setSheet("none")}
        title="Pick a new time"
      >
        <DateStrip
          value={date}
          onChange={pickDate}
          isEnabled={(d) => openWeekdays.includes(d.getDay())}
        />
        <div className="mt-4">
          {!date ? (
            <Hint>Choose a day.</Hint>
          ) : availableSet.size === 0 ? (
            <Hint>No open times on this day.</Hint>
          ) : (
            <SlotGrid
              times={dayTimes}
              available={availableSet}
              value={time}
              onChange={setTime}
            />
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
        <Stack gap="sm" className="mt-4">
          <Button variant="primary" block disabled={pending} onClick={submitCancel}>
            Yes, cancel it
          </Button>
          <Button variant="text" block onClick={() => setSheet("none")}>
            Keep appointment
          </Button>
        </Stack>
      </BottomSheet>
    </>
  );
}

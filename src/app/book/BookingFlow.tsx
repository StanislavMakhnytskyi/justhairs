"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { StickyBar } from "@/components/ui/StickyBar";
import { StepTabs } from "@/components/ui/SegmentedTabs";
import { Stack } from "@/components/ui/Section";
import { Hint } from "@/components/ui/Hint";
import { SummaryList, SummaryRow } from "@/components/ui/SummaryList";
import { ShopService } from "@/components/ui/ShopService";
import { StaffCard } from "@/components/ui/StaffCard";
import { DateStrip } from "@/components/ui/DateStrip";
import { SlotGrid } from "@/components/ui/SlotGrid";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { dayTimeGrid } from "@/lib/salon";
import { createBooking, getAvailableSlots } from "@/lib/actions/booking";
import type { ServiceWithCategory } from "@/lib/queries";
import type { Staff } from "@/lib/supabase/types";

const STEPS = ["Service", "Specialist", "Date & time", "Review"];

type Props = {
  services: ServiceWithCategory[];
  staff: Staff[];
  staffServices: { staff_id: string; service_id: string }[];
  openWeekdays: number[];
  isAuthed: boolean;
};

export function BookingFlow({
  services,
  staff,
  staffServices,
  openWeekdays,
  isAuthed,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const serviceSlug = params.get("service");
  const staffId = params.get("staff");
  const dateStr = params.get("date");
  const time = params.get("time");
  const stepParam = params.get("step");
  const timeMs = time ? new Date(time).getTime() : null;

  const service = useMemo(
    () => services.find((s) => s.slug === serviceSlug) ?? null,
    [services, serviceSlug],
  );

  const eligibleStaff = useMemo(() => {
    if (!service) return [];
    const ids = new Set(
      staffServices.filter((l) => l.service_id === service.id).map((l) => l.staff_id),
    );
    return staff.filter((s) => ids.has(s.id));
  }, [service, staff, staffServices]);

  const dayTimes = useMemo(
    () => (dateStr ? dayTimeGrid(dateStr) : []),
    [dateStr],
  );
  const availableSet = useMemo(
    () => new Set((slots ?? []).map((s) => new Date(s).getTime())),
    [slots],
  );

  const step: number = (() => {
    if (stepParam) return STEPS.findIndex((s) => s.toLowerCase().startsWith(stepParam));
    if (!service) return 0;
    if (!staffId) return 1;
    if (!time) return 2;
    return 3;
  })();

  const setParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      router.replace(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const loadSlots = useCallback(
    (day: string, sid: string | null) => {
      if (!service) return;
      startTransition(async () => {
        setLoadingSlots(true);
        const result = await getAvailableSlots({
          serviceId: service.id,
          staffId: sid === "any" || !sid ? null : sid,
          day,
        });
        setSlots(result);
        setLoadingSlots(false);
      });
    },
    [service],
  );

  // Load slots when arriving with a date already in the URL (deep link / back-nav).
  const needsSlots = !!(service && dateStr && staffId && slots === null && !loadingSlots);
  useEffect(() => {
    if (needsSlots) loadSlots(dateStr!, staffId);
  }, [needsSlots, dateStr, staffId, loadSlots]);

  function goToStep(i: number) {
    setParams({ step: STEPS[i].toLowerCase().split(" ")[0] });
  }

  async function confirm() {
    if (!service || !time) return;
    setError(null);
    if (!isAuthed) {
      router.push(
        `/login?next=${encodeURIComponent(`${pathname}?${params.toString()}`)}`,
      );
      return;
    }
    startTransition(async () => {
      const res = await createBooking({
        serviceId: service.id,
        staffId: staffId === "any" || !staffId ? null : staffId,
        startsAt: time,
      });
      if (res.ok) router.push(`/book/confirmation/${res.data.id}`);
      else setError(res.error);
    });
  }

  const chosenStaffName =
    staffId === "any"
      ? "Any specialist"
      : eligibleStaff.find((s) => s.id === staffId)?.name ?? null;

  return (
    <AppShell>
      <TopBar
        title="Book appointment"
        onBack={() => (step === 0 ? router.push("/services") : goToStep(step - 1))}
      />
      <div className="p-4">
        <StepTabs steps={STEPS} current={step} />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4">
        {step === 0 && (
          <Stack gap="sm">
            {services.map((s) => (
              <ShopService
                key={s.id}
                name={`${s.name} · ${s.category.name}`}
                priceCents={s.price_cents}
                durationMin={s.duration_min}
                description={s.description}
                photoUrl={s.photo_url}
                selected={s.slug === serviceSlug}
                action={s.slug === serviceSlug ? "Selected" : "Select"}
                onClick={() =>
                  setParams({
                    service: s.slug,
                    staff: null,
                    date: null,
                    time: null,
                    step: "specialist",
                  })
                }
              />
            ))}
          </Stack>
        )}

        {step === 1 && service && (
          <Stack gap="sm">
            <StaffCard
              name="Any specialist"
              subtitle="First available"
              selected={staffId === "any"}
              onClick={() => {
                setParams({ staff: "any", time: null, step: "date" });
                if (dateStr) loadSlots(dateStr, "any");
              }}
            />
            {eligibleStaff.map((s) => (
              <StaffCard
                key={s.id}
                name={s.name}
                subtitle={s.title}
                photoUrl={s.photo_url}
                selected={staffId === s.id}
                onClick={() => {
                  setParams({ staff: s.id, time: null, step: "date" });
                  if (dateStr) loadSlots(dateStr, s.id);
                }}
              />
            ))}
          </Stack>
        )}

        {step === 2 && service && (
          <div className="flex flex-col gap-4">
            <DateStrip
              value={dateStr ? new Date(`${dateStr}T00:00:00`) : null}
              isEnabled={(d) => openWeekdays.includes(d.getDay())}
              onChange={(d) => {
                const ds = format(d, "yyyy-MM-dd");
                setParams({ date: ds, time: null });
                loadSlots(ds, staffId);
              }}
            />
            {!dateStr ? (
              <Hint>Pick a day to see open times.</Hint>
            ) : loadingSlots || slots === null ? (
              <Hint>Finding open times…</Hint>
            ) : availableSet.size === 0 ? (
              <Hint>No open times on this day. Try another date.</Hint>
            ) : (
              <SlotGrid
                times={dayTimes}
                available={availableSet}
                value={timeMs}
                onChange={(t) =>
                  setParams({ time: new Date(t).toISOString(), step: "review" })
                }
              />
            )}
          </div>
        )}

        {step === 3 && service && time && (
          <SummaryList
            footnote="Pay after your visit. Free cancellation up to 24 hours before.">
            <SummaryRow
              label="Service"
              value={`${service.name} · ${service.category.name}`}
            />
            <SummaryRow label="Specialist" value={chosenStaffName ?? "—"} />
            <SummaryRow label="When" value={formatDateTime(time)} />
            <SummaryRow label="Duration" value={formatDuration(service.duration_min)} />
            <SummaryRow label="Total" value={formatPrice(service.price_cents)} strong />
          </SummaryList>
        )}
        {step === 3 && error && (
          <p className="mt-3 text-[13px] text-error">{error}</p>
        )}
      </div>

      {step === 3 && (
        <StickyBar>
          <span className="flex-1 text-[13px] text-text-secondary">
            {service ? formatPrice(service.price_cents) : ""}
          </span>
          <Button onClick={confirm} disabled={pending}>
            {isAuthed ? "Confirm booking" : "Sign in to confirm"}
          </Button>
        </StickyBar>
      )}
    </AppShell>
  );
}

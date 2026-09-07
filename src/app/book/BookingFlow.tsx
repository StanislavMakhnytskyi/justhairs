"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
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
import { SlotGrid, SlotGridSkeleton } from "@/components/ui/SlotGrid";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { dayTimeGrid, nextOpenDates } from "@/lib/salon";
import { createBooking, getAvailableSlots } from "@/lib/actions/booking";
import type { ServiceWithCategory } from "@/lib/queries";
import type { Staff } from "@/lib/supabase/types";

const STEPS = ["Service", "Specialist", "Date & time", "Review"];
const PENDING_KEY = "justhairs:pending-booking";

type Pending = { service: string; staff: string; date: string; time: string };

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

  // Client-side cache of slot lookups, keyed by staff+day, so re-visiting a
  // date (or a date we prefetched) is instant.
  const slotCache = useRef(new Map<string, string[]>());
  const cacheKey = (sid: string | null, day: string) => `${sid ?? "any"}:${day}`;

  const fetchSlots = useCallback(
    async (day: string, sid: string | null): Promise<string[]> => {
      if (!service) return [];
      const key = cacheKey(sid, day);
      const hit = slotCache.current.get(key);
      if (hit) return hit;
      const result = await getAvailableSlots({
        serviceId: service.id,
        staffId: sid === "any" || !sid ? null : sid,
        day,
      });
      slotCache.current.set(key, result);
      return result;
    },
    [service],
  );

  const loadSlots = useCallback(
    (day: string, sid: string | null) => {
      if (!service) return;
      const cached = slotCache.current.get(cacheKey(sid, day));
      if (cached) {
        setSlots(cached);
        setLoadingSlots(false);
        return;
      }
      startTransition(async () => {
        setLoadingSlots(true);
        setSlots(await fetchSlots(day, sid));
        setLoadingSlots(false);
      });
    },
    [service, fetchSlots],
  );

  // Load slots when arriving with a date already in the URL (deep link / back-nav).
  const needsSlots = !!(service && dateStr && staffId && slots === null && !loadingSlots);
  useEffect(() => {
    if (needsSlots) loadSlots(dateStr!, staffId);
  }, [needsSlots, dateStr, staffId, loadSlots]);

  // Warm the cache: as soon as we know the service (and staff, if picked),
  // fetch slots for the next few open days in the background so the calendar
  // and time grid have no perceptible lag.
  useEffect(() => {
    if (!service || step < 1) return;
    const sid = staffId ?? "any";
    for (const day of nextOpenDates(openWeekdays, 5)) {
      void fetchSlots(day, sid);
    }
  }, [service, staffId, step, openWeekdays, fetchSlots]);

  // Warm the confirmation route while the user is on the review step.
  useEffect(() => {
    if (step === 3) router.prefetch("/book/confirmation/pending");
  }, [step, router]);

  // Moving between steps should start you at the top, but not on first paint
  // (a deep link may point at a specific step already).
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [step]);

  // If the sign-in round-trip dropped the query string, restore the booking the
  // user was about to confirm from sessionStorage.
  useEffect(() => {
    if (serviceSlug) return;
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Pending;
      sessionStorage.removeItem(PENDING_KEY);
      if (p.service && p.time) {
        setParams({
          service: p.service,
          staff: p.staff || "any",
          date: p.date,
          time: p.time,
          step: "review",
        });
      }
    } catch {
      /* ignore malformed storage */
    }
  }, [serviceSlug, setParams]);

  function goToStep(i: number) {
    setParams({ step: STEPS[i].toLowerCase().split(" ")[0] });
  }

  function goBack() {
    if (step > 0) goToStep(step - 1);
    else router.push("/");
  }

  async function confirm() {
    if (!service || !time) return;
    setError(null);
    if (!isAuthed) {
      try {
        sessionStorage.setItem(
          PENDING_KEY,
          JSON.stringify({
            service: serviceSlug,
            staff: staffId,
            date: dateStr,
            time,
          }),
        );
      } catch {
        /* storage unavailable — the next param below still carries state */
      }
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
      ? eligibleStaff.length === 1
        ? eligibleStaff[0].name
        : "Any specialist"
      : eligibleStaff.find((s) => s.id === staffId)?.name ?? null;

  return (
    <AppShell>
      <TopBar title="Book appointment" onBack={goBack} />
      <div className="p-4">
        <StepTabs steps={STEPS} current={step} />
      </div>

      <div
        key={step}
        className="flex flex-1 flex-col px-4 pb-4 motion-safe:animate-fade-in-up"
      >
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
            {eligibleStaff.length > 1 && (
              <StaffCard
                name="Any specialist"
                subtitle="First available"
                selected={staffId === "any"}
                onClick={() => {
                  setParams({ staff: "any", time: null, step: "date" });
                  if (dateStr) loadSlots(dateStr, "any");
                }}
              />
            )}
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
              <SlotGridSkeleton />
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

      {step === 3 && service && (
        <StickyBar label="Total" value={formatPrice(service.price_cents)}>
          <Button onClick={confirm} loading={pending} className="shrink-0">
            {isAuthed ? "Confirm booking" : "Sign in to confirm"}
          </Button>
        </StickyBar>
      )}
    </AppShell>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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
import { Skeleton } from "@/components/ui/Skeleton";
import {
  formatDateTime,
  formatDuration,
  formatPrice,
  formatSlotTime,
  SALON_TZ,
} from "@/lib/format";
import { dayTimeGrid, nextOpenDates } from "@/lib/salon";
import { createBooking } from "@/lib/actions/booking";
import {
  getCachedSlots,
  loadSlots as loadSlotsInto,
  loadWindow,
  slotCacheKey,
  subscribeSlotCache,
} from "@/lib/slot-cache";
import type { ServiceWithCategory } from "@/lib/queries";
import type { Staff } from "@/lib/supabase/types";

const STEPS = ["Service", "Specialist", "Date & time", "Review"];
const STEP_PARAM = ["service", "specialist", "date", "review"];
/** Open days to prefetch — covers the date strip so empty days can be disabled. */
const DATE_WINDOW = 14;

/** "Thu 10:00" — for the next-available quick picks. */
function formatQuickPick(iso: string): string {
  const weekday = new Date(iso).toLocaleDateString("en-IE", {
    weekday: "short",
    timeZone: SALON_TZ,
  });
  return `${weekday} ${formatSlotTime(iso)}`;
}

function NextAvailable({
  label,
  picks,
  onPick,
}: {
  label: string;
  picks: { day: string; iso: string }[];
  onPick: (day: string, iso: string) => void;
}) {
  if (picks.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-label font-bold text-text-secondary">{label}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {picks.map((q) => (
          <button
            key={q.iso}
            type="button"
            onClick={() => onPick(q.day, q.iso)}
            className="rounded-[var(--radius-pill)] border border-border-strong bg-surface-card px-3 py-1.5 text-label font-bold text-text-primary transition-[color,border-color] duration-150 ease-[var(--ease-out)] hover:border-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
          >
            {formatQuickPick(q.iso)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Same geometry as NextAvailable, shown while the warm cache is still
 *  filling in — so the chips don't just pop in with a layout jump. */
function NextAvailableSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="mb-2 h-4 w-28" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-8 w-24 rounded-[var(--radius-pill)]"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

type Props = {
  services: ServiceWithCategory[];
  staff: Staff[];
  staffServices: { staff_id: string; service_id: string }[];
  openWeekdays: number[];
};

export function BookingFlow({
  services,
  staff,
  staffServices,
  openWeekdays,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState(false);

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

  // KNOWN ISSUE (CODE_REVIEW.md #15): an unrecognized ?step= value (a typo,
  // a hand-edited URL) makes findIndex return -1 here, and none of the
  // step===0..3 branches below render — the user lands on a blank flow with
  // no service list and no way back. Should fall back to inferring the step
  // from which fields are actually filled when stepParam doesn't match one.
  const step: number = (() => {
    if (stepParam) return STEPS.findIndex((s) => s.toLowerCase().startsWith(stepParam));
    if (!service) return 0;
    if (!staffId) return 1;
    if (!time) return 2;
    return 3;
  })();

  const setParams = useCallback(
    (patch: Record<string, string | null>, opts?: { push?: boolean }) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) next.delete(k);
        else next.set(k, v);
      }
      const url = `${pathname}?${next.toString()}`;
      // Step transitions push (so hardware Back walks the steps); in-place value
      // edits replace.
      if (opts?.push) router.push(url);
      else router.replace(url);
    },
    [params, pathname, router],
  );

  // Slot lookups live in a shared external store (src/lib/slot-cache) so the
  // "next available" quick picks below can read them during render. Show the
  // grid for the chosen day, from cache when we have it.
  //
  // Fixed (was CODE_REVIEW.md #4): a fetch for a day the user has since
  // moved on from could resolve after a newer one and clobber `slots` with
  // the wrong day's data — the grid would render every visible time as
  // unavailable (none of them match the day actually on screen) until the
  // next tap forced a fresh, uncontested fetch. `loadSlotsGeneration` tags
  // each call so a late-arriving result for an outdated (day, sid) is
  // dropped instead of applied.
  const loadSlotsGeneration = useRef(0);
  const loadSlots = useCallback(
    (day: string, sid: string | null) => {
      if (!service) return;
      const generation = ++loadSlotsGeneration.current;
      const isCurrent = () => loadSlotsGeneration.current === generation;
      const cached = getCachedSlots(slotCacheKey(service.id, sid, day));
      startTransition(async () => {
        if (cached) {
          if (isCurrent()) {
            setSlots(cached);
            setLoadingSlots(false);
            setSlotError(false);
          }
          return;
        }
        setLoadingSlots(true);
        setSlotError(false);
        try {
          const result = await loadSlotsInto(service.id, sid, day);
          if (isCurrent()) setSlots(result);
        } catch {
          if (isCurrent()) {
            setSlots([]);
            setSlotError(true);
          }
        }
        if (isCurrent()) setLoadingSlots(false);
      });
    },
    [service],
  );

  // Load slots when arriving with a date already in the URL (deep link / back-nav).
  const needsSlots = !!(service && dateStr && staffId && slots === null && !loadingSlots);
  useEffect(() => {
    if (needsSlots) loadSlots(dateStr!, staffId);
  }, [needsSlots, dateStr, staffId, loadSlots]);

  // Warm the whole date strip in ONE request as soon as we know the service —
  // the per-day fetches were queueing behind each other and made picking a day
  // feel slow.
  useEffect(() => {
    if (!service || step < 1) return;
    const sid = staffId ?? "any";
    void loadWindow(service.id, sid, nextOpenDates(openWeekdays, DATE_WINDOW)).catch(
      () => {},
    );
  }, [service, staffId, step, openWeekdays]);

  // Which of the strip's open days are known to have zero slots — those get
  // disabled so a normal in-app tap never lands on an empty day. Days we
  // haven't fetched yet stay enabled (optimistic); if a tap resolves empty the
  // effect below clears the selection.
  const availabilitySnapshot = useSyncExternalStore(
    subscribeSlotCache,
    () => {
      if (!service || step !== 2) return "";
      const sid = staffId ?? "any";
      return nextOpenDates(openWeekdays, DATE_WINDOW)
        .map((d) => {
          const c = getCachedSlots(slotCacheKey(service.id, sid, d));
          return `${d}:${c === undefined ? "?" : c.length === 0 ? "0" : "1"}`;
        })
        .join("|");
    },
    () => "",
  );
  const emptyDays = useMemo(() => {
    const set = new Set<string>();
    for (const part of availabilitySnapshot.split("|")) {
      const [d, state] = part.split(":");
      if (state === "0") set.add(d);
    }
    return set;
  }, [availabilitySnapshot]);

  // Whether the warm cache has resolved at least one day yet — while every
  // day is still "?" (unknown), show a skeleton instead of an empty/blank
  // "Next available" row.
  const windowReady = useMemo(
    () =>
      availabilitySnapshot !== "" &&
      availabilitySnapshot.split("|").some((part) => part.split(":")[1] !== "?"),
    [availabilitySnapshot],
  );

  // Earliest few bookable times, from the warm cache — shown both before a day
  // is picked and when the picked day turns out to be full.
  const slotSnapshot = useSyncExternalStore(
    subscribeSlotCache,
    () => {
      if (!service || step !== 2) return "";
      const sid = staffId ?? "any";
      return nextOpenDates(openWeekdays, DATE_WINDOW)
        .map((d) => `${d}=${getCachedSlots(slotCacheKey(service.id, sid, d))?.[0] ?? ""}`)
        .join("|");
    },
    () => "",
  );
  const nextAvailable = useMemo(() => {
    if (!slotSnapshot) return [];
    return slotSnapshot
      .split("|")
      .map((part) => {
        const eq = part.indexOf("=");
        return { day: part.slice(0, eq), iso: part.slice(eq + 1) };
      })
      .filter((q) => q.iso && q.day !== dateStr)
      .slice(0, 3);
  }, [slotSnapshot, dateStr]);

  const pickSlot = useCallback(
    (day: string, iso: string) => {
      setParams(
        { date: day, time: new Date(iso).toISOString(), step: "review" },
        { push: true },
      );
    },
    [setParams],
  );

  // If a service has exactly one eligible stylist, there's nothing to choose —
  // skip the specialist step. `replace` (not push) so Back lands on the service
  // list rather than looping through this step.
  useEffect(() => {
    if (step === 1 && service && !staffId && eligibleStaff.length === 1) {
      setParams({ staff: eligibleStaff[0].id, time: null, step: "date" });
    }
  }, [step, service, staffId, eligibleStaff, setParams]);

  // Moving between steps should start you at the top, but not on first paint
  // (a deep link may point at a specific step already).
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  }, [step]);

  // Jump to an earlier step, dropping every choice that belongs to a later one.
  const goToStep = useCallback(
    (target: number) => {
      if (target >= step || target < 0) return;
      const patch: Record<string, string | null> = { step: STEP_PARAM[target] };
      if (target < 3) patch.time = null;
      if (target < 2) patch.date = null;
      if (target < 1) patch.staff = null;
      setParams(patch, { push: true });
    },
    [step, setParams],
  );

  function goBack() {
    if (step > 0) goToStep(step - 1);
    else router.push("/");
  }

  function confirm() {
    if (!service || !time) return;
    setError(null);
    startTransition(async () => {
      const res = await createBooking({
        serviceId: service.id,
        staffId: staffId === "any" || !staffId ? null : staffId,
        startsAt: time,
      });
      if (res.ok) router.push(`/book/pay/${res.data.id}`);
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
      <div className="p-gutter">
        <StepTabs steps={STEPS} current={step} onStepClick={goToStep} />
      </div>

      <div
        key={step}
        className="flex flex-1 flex-col px-gutter pb-4 motion-safe:animate-fade-in-up"
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
                onClick={() =>
                  setParams(
                    {
                      service: s.slug,
                      staff: null,
                      date: null,
                      time: null,
                      step: "specialist",
                    },
                    { push: true },
                  )
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
                  setParams({ staff: "any", time: null, step: "date" }, { push: true });
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
                  setParams({ staff: s.id, time: null, step: "date" }, { push: true });
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
              isEnabled={(d) =>
                openWeekdays.includes(d.getDay()) &&
                !emptyDays.has(format(d, "yyyy-MM-dd"))
              }
              onChange={(d) => {
                const ds = format(d, "yyyy-MM-dd");
                setSlots(null);
                setSlotError(false);
                setParams({ date: ds, time: null });
                loadSlots(ds, staffId);
              }}
            />
            {!dateStr ? (
              <div className="flex flex-col gap-4">
                {windowReady ? (
                  <NextAvailable
                    label="Next available"
                    picks={nextAvailable}
                    onPick={pickSlot}
                  />
                ) : (
                  <NextAvailableSkeleton />
                )}
                <Hint>Pick a day to see open times.</Hint>
              </div>
            ) : loadingSlots || slots === null ? (
              <SlotGridSkeleton />
            ) : availableSet.size === 0 ? (
              <div className="flex flex-col gap-4">
                <Hint>
                  {slotError
                    ? "We couldn't load times for that day — try another."
                    : `Fully booked on ${format(
                        new Date(`${dateStr}T00:00:00`),
                        "EEEE d MMM",
                      )}.`}
                </Hint>
                {windowReady ? (
                  <NextAvailable
                    label="Next available"
                    picks={nextAvailable}
                    onPick={pickSlot}
                  />
                ) : (
                  <NextAvailableSkeleton />
                )}
              </div>
            ) : (
              <SlotGrid
                times={dayTimes}
                available={availableSet}
                value={timeMs}
                onChange={(t) =>
                  setParams(
                    { time: new Date(t).toISOString(), step: "review" },
                    { push: true },
                  )
                }
              />
            )}
          </div>
        )}

        {step === 3 && service && time && (
          <SummaryList footnote="Next: add your details and choose how to pay.">
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
          // KNOWN ISSUE (CODE_REVIEW.md #16): missing role="alert" — the
          // equivalent error text in PayForm has it; a screen-reader user
          // who fails to confirm here gets no auditory feedback at all.
          <p className="mt-3 text-label text-error">{error}</p>
        )}
      </div>

      {step === 3 && service && (
        <StickyBar label="Total" value={formatPrice(service.price_cents)}>
          <Button onClick={confirm} loading={pending} className="shrink-0">
            Confirm booking
          </Button>
        </StickyBar>
      )}
    </AppShell>
  );
}

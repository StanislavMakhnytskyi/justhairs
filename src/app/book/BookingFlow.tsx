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
  slotCacheKey,
  subscribeSlotCache,
} from "@/lib/slot-cache";
import type { ServiceWithCategory } from "@/lib/queries";
import type { Staff } from "@/lib/supabase/types";

const STEPS = ["Service", "Specialist", "Date & time", "Review"];
const PENDING_KEY = "justhairs:pending-booking";
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
  const [slotError, setSlotError] = useState(false);
  // Whether the current date came from the URL on first paint (a shared/deep
  // link) rather than a tap in the strip. Cleared the moment the user picks a
  // day themselves — see the date-strip / quick-pick handlers.
  const [enteredWithDate, setEnteredWithDate] = useState(() =>
    Boolean(params.get("date")),
  );

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
  const loadSlots = useCallback(
    (day: string, sid: string | null) => {
      if (!service) return;
      const cached = getCachedSlots(slotCacheKey(service.id, sid, day));
      startTransition(async () => {
        if (cached) {
          setSlots(cached);
          setLoadingSlots(false);
          setSlotError(false);
          return;
        }
        setLoadingSlots(true);
        setSlotError(false);
        try {
          setSlots(await loadSlotsInto(service.id, sid, day));
        } catch {
          setSlots([]);
          setSlotError(true);
        }
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

  // Warm the cache once we know the service (and staff, if picked) — fetch the
  // next few open days so the calendar and time grid have no perceptible lag.
  useEffect(() => {
    if (!service || step < 1) return;
    const sid = staffId ?? "any";
    for (const day of nextOpenDates(openWeekdays, DATE_WINDOW)) {
      void loadSlotsInto(service.id, sid, day).catch(() => {});
    }
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

  // A day picked in-app (not a deep link) that turns out to have no times: drop
  // it silently and let the now-disabled strip button speak for itself, rather
  // than showing a dead-end message.
  useEffect(() => {
    if (
      step === 2 &&
      dateStr &&
      !enteredWithDate &&
      !slotError &&
      !loadingSlots &&
      slots !== null &&
      availableSet.size === 0
    ) {
      setParams({ date: null, time: null });
    }
  }, [
    step,
    dateStr,
    enteredWithDate,
    slotError,
    loadingSlots,
    slots,
    availableSet,
    setParams,
  ]);

  // Earliest few bookable times, from the warm cache — quick picks on the date
  // step so a user needn't poke every day.
  const slotSnapshot = useSyncExternalStore(
    subscribeSlotCache,
    () => {
      if (!service || step !== 2 || dateStr) return "";
      const sid = staffId ?? "any";
      return nextOpenDates(openWeekdays, 5)
        .map((d) => getCachedSlots(slotCacheKey(service.id, sid, d))?.[0] ?? "")
        .join("|");
    },
    () => "",
  );
  const quickPicks = useMemo(() => {
    if (!slotSnapshot) return [];
    const days = nextOpenDates(openWeekdays, 5);
    return slotSnapshot
      .split("|")
      .map((iso, i) => ({ day: days[i], iso }))
      .filter((q) => q.iso)
      .slice(0, 3);
  }, [slotSnapshot, openWeekdays]);

  // Warm the confirmation route while the user is on the review step.
  useEffect(() => {
    if (step === 3) router.prefetch("/book/confirmation/pending");
  }, [step, router]);

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

  function goBack() {
    // Forward step transitions were pushed, so Back walks them.
    if (step > 0) router.back();
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
      <div className="p-gutter">
        <StepTabs steps={STEPS} current={step} />
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
                setEnteredWithDate(false);
                setSlots(null);
                setSlotError(false);
                setParams({ date: ds, time: null });
                loadSlots(ds, staffId);
              }}
            />
            {!dateStr ? (
              <div className="flex flex-col gap-3">
                {quickPicks.length > 0 && (
                  <div
                    role="group"
                    aria-label="Next available"
                    className="flex flex-wrap gap-2"
                  >
                    {quickPicks.map((q) => (
                      <button
                        key={q.iso}
                        type="button"
                        onClick={() => {
                          setEnteredWithDate(false);
                          setParams(
                            { date: q.day, time: q.iso, step: "review" },
                            { push: true },
                          );
                        }}
                        className="rounded-[var(--radius-pill)] border border-border-strong bg-surface-card px-3 py-1.5 text-label font-bold text-text-primary transition-[color,border-color] duration-150 ease-[var(--ease-out)] hover:border-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
                      >
                        {formatQuickPick(q.iso)}
                      </button>
                    ))}
                  </div>
                )}
                <Hint>Pick a day to see open times.</Hint>
              </div>
            ) : loadingSlots || slots === null ? (
              <SlotGridSkeleton />
            ) : availableSet.size === 0 ? (
              enteredWithDate || slotError ? (
                <Hint>
                  {slotError
                    ? "We couldn't load times for this day. Try another date."
                    : "No open times on this day. Try another date."}
                </Hint>
              ) : (
                // In-app tap on a day that resolved empty — the effect above is
                // clearing the selection; hold the skeleton for that beat.
                <SlotGridSkeleton />
              )
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
          <p className="mt-3 text-label text-error">{error}</p>
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

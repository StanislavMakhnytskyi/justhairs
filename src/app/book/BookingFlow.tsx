"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { BookShell } from "@/components/ticket/BookShell";
import { TicketPanel } from "@/components/ticket/TicketPanel";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { StickyBar } from "@/components/ui/StickyBar";
import { StepTabs } from "@/components/ui/SegmentedTabs";
import { Hint } from "@/components/ui/Hint";
import { SummaryList, SummaryRow } from "@/components/ui/SummaryList";
import { ShopService } from "@/components/ui/ShopService";
import { StaffCard } from "@/components/ui/StaffCard";
import { DateStrip, type DayStatus } from "@/components/ui/DateStrip";
import { SlotGrid, SlotGridSkeleton } from "@/components/ui/SlotGrid";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import {
  addDaysToDay,
  BOOKABLE_DAYS,
  dayTimeGrid,
  nextOpenDates,
  parseDay,
  salonDayString,
  validDay,
  validTime,
  weekdayOf,
} from "@/lib/salon";
import { createBooking } from "@/lib/actions/booking";
import {
  getCachedSlots,
  invalidateDay,
  loadSlots as loadSlotsInto,
  loadWindow,
  slotCacheKey,
  subscribeSlotCache,
} from "@/lib/slot-cache";
import type { ServiceWithCategory } from "@/lib/queries";
import type { Staff } from "@/lib/supabase/types";
import { NextAvailable, NextAvailableSkeleton } from "./NextAvailable";

const STEPS = ["Service", "Specialist", "Date & time", "Review"];
const STEP_PARAM = ["service", "specialist", "date", "review"];
/** What each step asks — the focused step heading and the tab title. */
const STEP_TITLES = [
  "Choose a service",
  "Choose a specialist",
  "Choose a date and time",
  "Review your booking",
];
/** Open days to prefetch up front — feeds the "Next available" picks. */
const DATE_WINDOW = 14;
/** The availability RPC's longest range (see `getDayAvailability`). */
const MAX_RANGE_DAYS = 31;
/** How long the "Next available" placeholder may shimmer before it gives up
 *  (a failed or very slow lookup) and the row is dropped. */
const NEXT_AVAILABLE_TIMEOUT_MS = 6000;
const TIME_GRID_ID = "time-grid";

/** The step a /book URL shows, by the same rule `BookingFlow` uses — so Back
 *  can tell whether the previous history entry is the step it wants. */
function stepOfUrl(url: string): number {
  const q = new URLSearchParams(url.split("?")[1] ?? "");
  const inferred = !q.get("service") ? 0 : !q.get("staff") ? 1 : !q.get("time") ? 2 : 3;
  const named = STEP_PARAM.indexOf(q.get("step") ?? "");
  return Math.min(named >= 0 ? named : inferred, inferred);
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
  // A booking error belongs to the (step, time) it happened on, so it clears
  // itself the moment either changes — no effect needed to reset it.
  const [error, setError] = useState<{ message: string; key: string } | null>(null);
  // The day whose chosen time was taken under us; shows the recovery notice
  // on the date step until a new day or time is picked.
  const [slotTakenDay, setSlotTakenDay] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [slots, setSlots] = useState<string[] | null>(null);
  // Which (day, staff) `slots` actually belongs to. The URL params and
  // `slots` are updated by two different mechanisms — a router navigation
  // vs. a resolved fetch — so they can briefly disagree about which
  // selection is "current." Rendering the grid only once they match (see the
  // skeleton guard in step 2 below) means that disagreement is never
  // visible, no matter which side lags.
  const [slotsFor, setSlotsFor] = useState<string | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotError, setSlotError] = useState(false);

  const serviceSlug = params.get("service");
  const staffId = params.get("staff");
  // A hand-edited ?date=banana / ?date=2026-02-30 / ?time=banana is treated as
  // absent, so the flow falls back to the step that still has something to pick.
  const dateStr = validDay(params.get("date"));
  const time = validTime(params.get("time"));
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

  const selectedDay = useMemo(
    () => (dateStr ? parseDay(dateStr) : null),
    [dateStr],
  );
  const dayTimes = useMemo(
    () => (dateStr ? dayTimeGrid(dateStr) : []),
    [dateStr],
  );
  const availableSet = useMemo(
    () => new Set((slots ?? []).map((s) => new Date(s).getTime())),
    [slots],
  );

  // Which step to show. An explicit ?step= wins, but a value we don't know
  // (a typo, a hand-edited URL) falls back to the first step that still has
  // something to choose, so the flow never renders blank.
  const inferredStep = !service ? 0 : !staffId ? 1 : !time ? 2 : 3;
  const namedStep = stepParam ? STEP_PARAM.indexOf(stepParam) : -1;
  const rawStep = namedStep >= 0 ? namedStep : inferredStep;
  // Never show a step whose inputs are missing (e.g. ?step=review with no time).
  const step: number = Math.min(rawStep, inferredStep);

  // The step body fades in when you move between steps, never on first load:
  // there it would start at opacity 0 the instant the loading skeleton is
  // replaced, which reads as a blink. `hasMoved` keeps later returns to the
  // first step animated too.
  const [firstStep] = useState(step);
  const [hasMoved, setHasMoved] = useState(false);
  const animateBody = hasMoved || step !== firstStep;

  const currentUrl = `${pathname}?${params.toString()}`;
  const historyStack = useRef<string[]>([]);
  const pendingPush = useRef<string | null>(null);

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
      if (opts?.push) {
        pendingPush.current = url;
        router.push(url);
      } else router.replace(url);
    },
    [params, pathname, router],
  );

  // A mirror of the history entries this flow has created, so the in-app Back
  // arrow can use `router.back()` when the entry behind us is the step it wants
  // (no duplicate entries, no Back/Forward ping-pong) and fall back to a
  // `replace` when it isn't (a deep link, or arriving from another page).
  // Kept in step with hardware Back too: landing on the entry below the top
  // pops it; any other unannounced change rewrites the top.
  useEffect(() => {
    const s = historyStack.current;
    if (s.length === 0) s.push(currentUrl);
    else if (s[s.length - 1] === currentUrl) return;
    else if (pendingPush.current === currentUrl) s.push(currentUrl);
    else if (s.length > 1 && s[s.length - 2] === currentUrl) s.pop();
    else s[s.length - 1] = currentUrl;
    pendingPush.current = null;
  }, [currentUrl]);

  // Slot lookups live in a shared external store (src/lib/slot-cache) so the
  // "next available" quick picks below can read them during render. Show the
  // grid for the chosen day, from cache when we have it.
  //
  // Fixed (was CODE_REVIEW.md #4): a fetch for a (day, staff) the user has
  // since moved on from could resolve after a newer one and clobber `slots`
  // with the wrong selection's data — the grid would render every visible
  // time as unavailable (none of them match the day actually on screen)
  // until the next tap forced a fresh, uncontested fetch. Two things fix
  // this together: `loadSlotsGeneration` drops a late-arriving result for a
  // superseded call outright, and `slotsFor` records which (day, staff)
  // `slots` actually reflects so the grid only ever renders once that
  // matches the URL — closing the gap even when the mismatch comes from the
  // router's own params update lagging behind a fast (e.g. cached) fetch,
  // not just from two competing fetches.
  const slotsKey = (day: string, sid: string | null) => `${day}:${sid ?? ""}`;
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
            setSlotsFor(slotsKey(day, sid));
            setLoadingSlots(false);
            setSlotError(false);
          }
          return;
        }
        setLoadingSlots(true);
        setSlotError(false);
        try {
          const result = await loadSlotsInto(service.id, sid, day);
          if (isCurrent()) {
            setSlots(result);
            setSlotsFor(slotsKey(day, sid));
          }
        } catch {
          if (isCurrent()) {
            setSlots([]);
            setSlotsFor(slotsKey(day, sid));
            setSlotError(true);
          }
        }
        if (isCurrent()) setLoadingSlots(false);
      });
    },
    [service],
  );

  // Load slots whenever the URL's (date, staff) doesn't match what `slots`
  // was last loaded for — covers arriving with a date already in the URL
  // (deep link / back-nav) *and* landing back on this step with a stale
  // selection still loaded (e.g. after a "next available" chip jumped
  // straight to Review for a different day than the one last viewed here).
  const needsSlots = !!(
    service &&
    dateStr &&
    staffId &&
    !loadingSlots &&
    slotsFor !== slotsKey(dateStr, staffId)
  );
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

  // Every open day in the bookable window — what the date strip can show.
  const windowDays = useMemo(() => {
    const today = salonDayString();
    const out: string[] = [];
    for (let i = 0; i < BOOKABLE_DAYS; i++) {
      const d = addDaysToDay(today, i);
      if (openWeekdays.includes(weekdayOf(d))) out.push(d);
    }
    return out;
  }, [openWeekdays]);

  // As the strip scrolls beyond the warmed fortnight, fetch the days coming
  // into view (plus a week ahead) in one range call, so full days grey out
  // before they are tapped. Cached days are skipped by `loadWindow`.
  const warmRange = useCallback(
    (first: string, last: string) => {
      if (!service) return;
      const end = addDaysToDay(last, 7);
      const days = windowDays.filter((d) => d >= first && d <= end);
      if (days.length === 0) return;
      const cap = addDaysToDay(days[0], MAX_RANGE_DAYS - 1);
      void loadWindow(
        service.id,
        staffId ?? "any",
        days.filter((d) => d <= cap),
      ).catch(() => {});
    },
    [service, staffId, windowDays],
  );

  // Which of the strip's open days are known to have zero slots — those get
  // disabled so a normal in-app tap never lands on an empty day. Days we
  // haven't fetched yet stay enabled (optimistic); a tap that resolves empty
  // shows "Fully booked" with the next available times.
  const availabilitySnapshot = useSyncExternalStore(
    subscribeSlotCache,
    () => {
      if (!service || step !== 2) return "";
      const sid = staffId ?? "any";
      return windowDays
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
  // "Next available" row. The skeleton is time-boxed: if the lookup fails or
  // stalls, the row is dropped rather than shimmering forever.
  const windowReady = useMemo(
    () =>
      availabilitySnapshot !== "" &&
      availabilitySnapshot.split("|").some((part) => part.split(":")[1] !== "?"),
    [availabilitySnapshot],
  );
  const windowKey = service ? `${service.id}:${staffId ?? "any"}` : "";
  const [timedOutFor, setTimedOutFor] = useState<string | null>(null);
  useEffect(() => {
    if (step !== 2 || windowReady || !windowKey) return;
    const t = setTimeout(() => setTimedOutFor(windowKey), NEXT_AVAILABLE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [step, windowReady, windowKey]);
  const windowTimedOut = timedOutFor === windowKey;

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
      setSlotTakenDay(null);
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
  // (a deep link may point at a specific step already). Focus goes to the new
  // step's heading, so a screen reader announces where you are and Tab
  // continues from the top of the new step instead of from a control that no
  // longer exists.
  const lastStep = useRef(step);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    setHasMoved(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    headingRef.current?.focus({ preventScroll: true });
  }, [step]);

  // The tab title names the step, so history, tab strips and screen readers
  // can tell the steps apart. The router re-applies the page's static metadata
  // title after every soft navigation (a moment after this effect runs), so
  // watch <head> and put the step title back whenever that happens.
  const pageTitle = `${STEP_TITLES[step]} — Book — justhairs`;
  // `active` goes false in the layout-effect cleanup (before the next page's
  // title lands), and the route must still be /book, so navigating on to the
  // pay page can never have its title overwritten by a late mutation callback.
  const titleActive = useRef(false);
  useLayoutEffect(() => {
    titleActive.current = true;
    return () => {
      titleActive.current = false;
    };
  }, []);
  useEffect(() => {
    const apply = () => {
      if (!titleActive.current || window.location.pathname !== "/book") return;
      if (document.title !== pageTitle) document.title = pageTitle;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [pageTitle]);

  // Jump to an earlier step, dropping every choice that belongs to a later one.
  const goToStep = useCallback(
    (target: number) => {
      if (target >= step || target < 0) return;
      // Same as Back: a single-stylist service has no specialist step to land on.
      if (target === 1 && eligibleStaff.length === 1) target = 0;
      const patch: Record<string, string | null> = { step: STEP_PARAM[target] };
      if (target < 3) patch.time = null;
      if (target < 2) patch.date = null;
      if (target < 1) patch.staff = null;
      setParams(patch, { push: true });
    },
    [step, setParams, eligibleStaff.length],
  );

  // The in-app Back arrow. When the history entry behind us is the step we
  // want, go back to it (so hardware Forward still works and nothing is
  // duplicated); otherwise — a deep link, or arriving from another page —
  // replace this entry with the previous step instead of stacking a new one.
  function goBack() {
    if (step === 0) {
      router.push("/");
      return;
    }
    // A single-stylist service skips the specialist step on the way in, so
    // skip it on the way out too (it would bounce straight forward again).
    let target = step - 1;
    if (target === 1 && eligibleStaff.length === 1) target = 0;
    const s = historyStack.current;
    const prev = s.length > 1 ? s[s.length - 2] : null;
    if (prev && prev.split("?")[0] === pathname && stepOfUrl(prev) === target) {
      router.back();
      return;
    }
    const patch: Record<string, string | null> = { step: STEP_PARAM[target] };
    if (target < 3) patch.time = null;
    if (target < 2) patch.date = null;
    if (target < 1) patch.staff = null;
    setParams(patch);
  }

  function confirm() {
    if (!service || !time) return;
    const errorKey = `${step}|${time}`;
    setError(null);
    startTransition(async () => {
      try {
        const res = await createBooking({
          serviceId: service.id,
          staffId: staffId === "any" || !staffId ? null : staffId,
          startsAt: time,
        });
        if (res.ok) {
          router.push(`/book/pay/${res.data.id}`);
        } else if (res.code === "SLOT_TAKEN") {
          // Someone got there first. Forget what we knew about that day, go
          // back to the date step with the day still picked and say so; the
          // grid re-fetches and shows only what is really still open.
          const day = salonDayString(new Date(time));
          invalidateDay(service.id, day);
          setSlotsFor(null);
          setSlotTakenDay(day);
          setParams({ date: day, time: null, step: "date" });
        } else {
          setError({ message: res.error, key: errorKey });
        }
      } catch {
        // A rejected server action (dropped connection) must not escape to the
        // error boundary — the held choices are all still in the URL.
        setError({
          message: "We couldn't reach the salon. Check your connection and try again.",
          key: errorKey,
        });
      }
    });
  }

  const errorMessage = error && error.key === `${step}|${time}` ? error.message : null;

  // The slot region's state, in words: read out (politely) as it changes,
  // and shown above the grid.
  const slotsReady =
    !!dateStr && !loadingSlots && slots !== null && slotsFor === slotsKey(dateStr, staffId);
  const openCount = slotsReady ? dayTimes.filter((t) => availableSet.has(t)).length : 0;
  const dayLabel = dateStr ? format(parseDay(dateStr), "EEEE d MMMM") : ""; // dateStr is validated
  const slotStatus = !dateStr
    ? ""
    : !slotsReady
      ? "Finding open times…"
      : slotError
        ? `Times for ${dayLabel} didn’t load.`
        : openCount === 0
          ? `Fully booked on ${dayLabel}.`
          : `${openCount} ${openCount === 1 ? "time" : "times"} available on ${dayLabel}`;
  const showSlotTaken = step === 2 && !!dateStr && slotTakenDay === dateStr;

  const dayStatus = useCallback(
    (d: Date): DayStatus =>
      !openWeekdays.includes(d.getDay())
        ? "closed"
        : emptyDays.has(format(d, "yyyy-MM-dd"))
          ? "full"
          : "open",
    [openWeekdays, emptyDays],
  );

  // "Choose another time": take keyboard / screen-reader users straight to
  // whatever can be picked now — the grid, else the quick picks, else the days.
  function focusChoices() {
    const target =
      document.querySelector<HTMLElement>(`#${TIME_GRID_ID} [tabindex="0"]`) ??
      document.querySelector<HTMLElement>('[role="group"][aria-label="Next available"] button') ??
      document.querySelector<HTMLElement>('[aria-label="Choose a date"] [tabindex="0"]');
    target?.focus();
  }

  const nextAvailableRow = windowReady ? (
    <NextAvailable label="Next available" picks={nextAvailable} onPick={pickSlot} />
  ) : windowTimedOut ? null : (
    <NextAvailableSkeleton />
  );

  const chosenStaffName =
    staffId === "any"
      ? eligibleStaff.length === 1
        ? eligibleStaff[0].name
        : "Any specialist"
      : eligibleStaff.find((s) => s.id === staffId)?.name ?? null;

  return (
    <BookShell
      aside={
        <TicketPanel
          serviceName={service?.name ?? null}
          categoryName={service?.category.name}
          photoUrl={service?.photo_url}
          priceCents={service?.price_cents ?? null}
          durationMin={service?.duration_min ?? null}
          staffName={chosenStaffName}
          time={time}
          step={step}
        />
      }
    >
      <TopBar title="Book appointment" onBack={goBack} />
      <div className="px-gutter pb-2 pt-5">
        <StepTabs steps={STEPS} current={step} onStepClick={goToStep} />
      </div>

      <div
        key={step}
        className={`flex flex-1 flex-col px-gutter pb-6 pt-3 ${
          animateBody ? "motion-safe:animate-fade-in-up" : ""
        }`}
      >
        {/* The step indicator above already shows where you are; this heading
            is for screen readers and is where focus lands on a step change. */}
        <h2 ref={headingRef} tabIndex={-1} className="sr-only">
          Step {step + 1} of {STEPS.length}: {STEP_TITLES[step]}
        </h2>
        {step === 0 && (
          <div className="flex flex-col">
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
          </div>
        )}

        {step === 1 && service && (
          <div className="flex flex-col">
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
          </div>
        )}

        {step === 2 && service && (
          <div className="flex flex-col gap-4">
            <DateStrip
              value={selectedDay}
              getStatus={dayStatus}
              onRangeChange={warmRange}
              onChange={(d) => {
                const ds = format(d, "yyyy-MM-dd");
                setSlots(null);
                setSlotError(false);
                setSlotTakenDay(null);
                setParams({ date: ds, time: null });
                loadSlots(ds, staffId);
              }}
            />

            {showSlotTaken && (
              <div
                role="alert"
                className="flex flex-col items-start gap-1 rounded-[var(--radius-md)] bg-brand-subtle px-4 pb-2 pt-3"
              >
                <p className="text-label font-bold text-text-primary">
                  That time was just taken — here are the times still open.
                </p>
                <Button variant="text" size="sm" className="-ml-3" onClick={focusChoices}>
                  Choose another time
                </Button>
              </div>
            )}

            {!dateStr && (
              <>
                {nextAvailableRow}
                <Hint>Pick a day to see open times.</Hint>
              </>
            )}

            {/* One live region for the whole slot area, mounted for the life of
                the step so its changes are announced; busy while loading so a
                screen reader waits for the result instead of the shimmer. */}
            <div
              className={dateStr ? "flex flex-col gap-3" : "contents"}
              aria-busy={!!dateStr && !slotsReady}
            >
              <p
                role="status"
                className={dateStr ? "text-label font-bold text-text-secondary" : "sr-only"}
              >
                {slotStatus}
              </p>
              {!dateStr ? null : !slotsReady ? (
                <SlotGridSkeleton />
              ) : slotError ? (
                <div className="flex flex-col gap-4">
                  <Hint className="flex flex-col items-center gap-3">
                    <span>Check your connection, then try again — or pick another day.</span>
                    <Button
                      variant="outlined"
                      size="md"
                      onClick={() => loadSlots(dateStr, staffId)}
                    >
                      Try again
                    </Button>
                  </Hint>
                  {nextAvailableRow}
                </div>
              ) : openCount === 0 ? (
                nextAvailableRow
              ) : (
                <SlotGrid
                  key={dateStr}
                  id={TIME_GRID_ID}
                  times={dayTimes}
                  available={availableSet}
                  value={timeMs}
                  onChange={(t) => {
                    setSlotTakenDay(null);
                    setParams(
                      { time: new Date(t).toISOString(), step: "review" },
                      { push: true },
                    );
                  }}
                />
              )}
            </div>
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
        {step === 3 && errorMessage && (
          <p className="mt-3 text-label font-medium text-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>

      {step === 3 && service && (
        <StickyBar label="Total" value={formatPrice(service.price_cents)}>
          <Button onClick={confirm} loading={pending} className="shrink-0">
            Confirm booking
          </Button>
        </StickyBar>
      )}
    </BookShell>
  );
}

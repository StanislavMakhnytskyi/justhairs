"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { BOOKABLE_DAYS, parseDay, salonToday } from "@/lib/salon";
import { rovingIndex } from "./roving";

export type DayStatus = "open" | "closed" | "full";

const STATUS_TEXT: Record<Exclude<DayStatus, "open">, string> = {
  closed: "Closed",
  full: "Full",
};
const STATUS_LABEL: Record<Exclude<DayStatus, "open">, string> = {
  closed: "closed",
  full: "fully booked",
};

const ARROW =
  "grid size-11 place-items-center rounded-full text-text-primary transition-colors duration-150 ease-[var(--ease-out)] hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-brand focus-visible:-outline-offset-2 aria-disabled:cursor-default aria-disabled:text-text-tertiary aria-disabled:hover:bg-transparent";

/** "November 2026", or "Nov – Dec 2026" / "Dec 2026 – Jan 2027" across a turn. */
function monthLabel(a: Date, b: Date): string {
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) {
    return format(a, "MMMM yyyy");
  }
  return a.getFullYear() === b.getFullYear()
    ? `${format(a, "MMM")} – ${format(b, "MMM yyyy")}`
    : `${format(a, "MMM yyyy")} – ${format(b, "MMM yyyy")}`;
}

/**
 * The booking date picker: a scrolling strip of day stubs covering the whole
 * bookable window, with the month it is showing and earlier/later controls
 * above it. A radiogroup with one tab stop: arrows (and Home/End, PageUp/Down
 * for a week) move between days, Space/Enter picks one. Closed and fully
 * booked days stay focusable (`aria-disabled`) and say why.
 */
export function DateStrip({
  value,
  onChange,
  days = BOOKABLE_DAYS,
  from,
  getStatus,
  onRangeChange,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  days?: number;
  from?: Date;
  /** Closed / fully booked days are shown muted and can't be picked. */
  getStatus?: (d: Date) => DayStatus;
  /** The yyyy-MM-dd span the strip is showing, after scrolling settles — so
   *  the caller can fetch availability for the days coming into view. */
  onRangeChange?: (first: string, last: string) => void;
}) {
  // Anchored to the start of the day and memoised on the day, not the instant:
  // a fresh `new Date()` per render churned every button's key (a full remount
  // on each render) and re-ran the scroll-into-view effect below.
  const startKey = format(from ?? salonToday(), "yyyy-MM-dd");
  const list = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(parseDay(startKey), i)),
    [startKey, days],
  );
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focused, setFocused] = useState<number | null>(null);
  // Which stubs are in view: drives the month label and the arrows' ends.
  const [view, setView] = useState({ first: 0, last: 6, atStart: true, atEnd: false });

  const rangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const measure = useCallback(() => {
    const el = scrollerRef.current;
    const a = refs.current[0];
    const b = refs.current[1];
    if (!el || !a || !b) return;
    const pitch = b.offsetLeft - a.offsetLeft;
    if (pitch <= 0) return;
    const first = Math.max(0, Math.min(list.length - 1, Math.round(el.scrollLeft / pitch)));
    const perView = Math.max(1, Math.floor((el.clientWidth - a.offsetLeft) / pitch));
    const last = Math.min(list.length - 1, first + perView - 1);
    const next = {
      first,
      last,
      atStart: el.scrollLeft <= 1,
      atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1,
    };
    setView((v) =>
      v.first === next.first &&
      v.last === next.last &&
      v.atStart === next.atStart &&
      v.atEnd === next.atEnd
        ? v
        : next,
    );
    if (onRangeChange) {
      if (rangeTimer.current) clearTimeout(rangeTimer.current);
      rangeTimer.current = setTimeout(
        () =>
          onRangeChange(format(list[first], "yyyy-MM-dd"), format(list[last], "yyyy-MM-dd")),
        200,
      );
    }
  }, [list, onRangeChange]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    // Fires once on observe, which takes the first measurement.
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      el.removeEventListener("scroll", onScroll);
      if (rangeTimer.current) clearTimeout(rangeTimer.current);
    };
  }, [measure]);

  // Center the selected day whenever it changes — on a deep-linked initial
  // value (instant) and on every subsequent tap (eased), so a click near
  // either edge of the strip doesn't leave the new day half off-screen.
  const valueKey = value ? format(value, "yyyy-MM-dd") : null;
  const checkedIdx = value ? list.findIndex((d) => isSameDay(d, value)) : -1;
  useEffect(() => {
    if (checkedIdx < 0) return;
    const el = refs.current[checkedIdx];
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: reduced ? "auto" : "smooth",
    });
    // Keyed on the day, not the index object, so a re-render doesn't re-scroll.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueKey]);

  const statusOf = (d: Date): DayStatus => (getStatus ? getStatus(d) : "open");
  const firstOpen = list.findIndex((d) => statusOf(d) === "open");
  const tabStop =
    focused !== null && focused < list.length
      ? focused
      : checkedIdx >= 0
        ? checkedIdx
        : Math.max(0, firstOpen);

  function page(dir: -1 | 1) {
    const el = scrollerRef.current;
    const a = refs.current[0];
    const b = refs.current[1];
    if (!el || !a || !b) return;
    const pitch = b.offsetLeft - a.offsetLeft;
    const perView = Math.max(1, view.last - view.first);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * perView * pitch, behavior: reduced ? "auto" : "smooth" });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <p className="text-subhead font-bold text-text-primary">
          {monthLabel(list[view.first], list[view.last])}
        </p>
        <div className="-mr-2.5 flex">
          <button
            type="button"
            aria-label="Earlier dates"
            aria-disabled={view.atStart || undefined}
            onClick={() => !view.atStart && page(-1)}
            className={ARROW}
          >
            <ChevronLeft size={22} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Later dates"
            aria-disabled={view.atEnd || undefined}
            onClick={() => !view.atEnd && page(1)}
            className={ARROW}
          >
            <ChevronRight size={22} aria-hidden />
          </button>
        </div>
      </div>
      <div
        ref={scrollerRef}
        role="radiogroup"
        aria-label="Choose a date"
        className="-mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-2 overflow-x-auto px-gutter py-1 [scrollbar-width:none]"
        onKeyDown={(e) => {
          const from = refs.current.findIndex((el) => el === document.activeElement);
          if (from < 0) return;
          const next = rovingIndex(e.key, from, list.length, { page: 7 });
          if (next === null) return;
          e.preventDefault();
          refs.current[next]?.focus();
        }}
      >
        {list.map((d, i) => {
          const active = checkedIdx === i;
          const status = statusOf(d);
          const enabled = status === "open";
          return (
            <button
              key={format(d, "yyyy-MM-dd")}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              onClick={() => enabled && onChange(d)}
              onFocus={() => setFocused(i)}
              // aria-disabled keeps closed / full days in the arrow order so
              // they are read out ("closed") rather than silently skipped.
              aria-disabled={!enabled || undefined}
              tabIndex={i === tabStop ? 0 : -1}
              role="radio"
              aria-checked={active}
              aria-label={
                enabled
                  ? format(d, "EEEE d MMMM")
                  : `${format(d, "EEEE d MMMM")}, ${STATUS_LABEL[status]}`
              }
              className={cn(
                "flex w-14 shrink-0 snap-start flex-col items-center gap-0.5 rounded-[var(--radius-sm)] border pb-1.5 pt-2.5 transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
                !enabled &&
                  "cursor-not-allowed border-border-default bg-surface-sunken text-text-tertiary",
                enabled &&
                  !active &&
                  "border-border-strong bg-surface-card text-text-primary hover:border-brand motion-safe:active:scale-[0.96]",
                active && "border-brand bg-brand text-text-on-brand",
              )}
            >
              <span className="text-caption font-medium opacity-80">{format(d, "EEE")}</span>
              <span className="text-subhead">{format(d, "d")}</span>
              <span aria-hidden className="text-caption font-medium">
                {enabled ? " " : STATUS_TEXT[status]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/cn";

export function DateStrip({
  value,
  onChange,
  days = 14,
  from,
  isEnabled,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  days?: number;
  from?: Date;
  /** Return false for days the salon is closed — shown muted + not selectable. */
  isEnabled?: (d: Date) => boolean;
}) {
  // Anchored to the start of the day and memoised on the day, not the instant:
  // a fresh `new Date()` per render churned every button's key (a full remount
  // on each render) and re-ran the scroll-into-view effect below.
  const startKey = format(from ?? new Date(), "yyyy-MM-dd");
  const list = useMemo(
    () => Array.from({ length: days }, (_, i) => addDays(new Date(`${startKey}T00:00:00`), i)),
    [startKey, days],
  );
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Center the selected day whenever it changes — on a deep-linked initial
  // value (instant) and on every subsequent tap (eased), so a click near
  // either edge of the strip doesn't leave the new day half off-screen.
  const valueKey = value ? format(value, "yyyy-MM-dd") : null;
  useEffect(() => {
    if (!valueKey || !activeRef.current) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    activeRef.current.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: reduced ? "auto" : "smooth",
    });
  }, [valueKey]);

  return (
    <div
      role="radiogroup"
      aria-label="Choose a date"
      className="-mx-gutter flex snap-x snap-mandatory gap-2 overflow-x-auto px-gutter pb-1 [scrollbar-width:none]"
    >
      {list.map((d) => {
        const active = value ? isSameDay(d, value) : false;
        const enabled = isEnabled ? isEnabled(d) : true;
        return (
          <button
            key={format(d, "yyyy-MM-dd")}
            ref={active ? activeRef : undefined}
            onClick={() => enabled && onChange(d)}
            disabled={!enabled}
            role="radio"
            aria-checked={active}
            aria-label={format(d, "EEEE d MMMM")}
            className={cn(
              "flex w-14 shrink-0 snap-start flex-col items-center gap-1 rounded-[var(--radius-sm)] border py-2.5 transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
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
          </button>
        );
      })}
    </div>
  );
}

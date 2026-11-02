"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { formatSlotTime } from "@/lib/format";
import { rovingIndex } from "./roving";

const CELL =
  "flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] border py-2 text-body font-bold";
const COLUMNS = 3;

export function SlotGrid({
  times,
  available,
  value,
  onChange,
  id,
}: {
  /** Every candidate start time for the day, as epoch millis. */
  times: number[];
  /** The subset that can actually be booked. */
  available: Set<number>;
  value: number | null;
  onChange: (t: number) => void;
  id?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // Roving tabindex: the group is one tab stop — the chosen time, else the
  // last one focused, else the first open one. Arrows move focus; Space/Enter
  // choose (choosing advances the flow, so it must not follow focus).
  const [focused, setFocused] = useState<number | null>(null);
  if (times.length === 0) return null;

  const checkedIdx = value === null ? -1 : times.indexOf(value);
  const firstOpen = times.findIndex((t) => available.has(t));
  const tabStop =
    focused !== null && focused < times.length
      ? focused
      : checkedIdx >= 0
        ? checkedIdx
        : Math.max(0, firstOpen);

  return (
    <div
      id={id}
      role="radiogroup"
      aria-label="Choose a time"
      className="grid grid-cols-3 gap-2"
      onKeyDown={(e) => {
        const from = refs.current.findIndex((el) => el === document.activeElement);
        if (from < 0) return;
        const next = rovingIndex(e.key, from, times.length, { columns: COLUMNS });
        if (next === null) return;
        e.preventDefault();
        refs.current[next]?.focus();
      }}
    >
      {times.map((t, i) => {
        const active = t === value;
        const open = available.has(t);
        const label = formatSlotTime(t);
        return (
          <button
            key={t}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            onClick={() => open && onChange(t)}
            onFocus={() => setFocused(i)}
            // aria-disabled, not disabled: a booked time stays reachable with
            // the arrows and is read out as unavailable instead of vanishing.
            aria-disabled={!open || undefined}
            aria-label={open ? undefined : `${label}, unavailable`}
            tabIndex={i === tabStop ? 0 : -1}
            role="radio"
            aria-checked={active}
            className={cn(
              CELL,
              "transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
              !open &&
                "cursor-not-allowed border-border-default bg-surface-sunken text-text-tertiary line-through",
              open &&
                !active &&
                "border-border-strong bg-surface-card text-text-primary hover:border-brand motion-safe:active:scale-[0.96]",
              active && "border-brand bg-brand text-text-on-brand",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Same geometry as the real grid, so replacing it with data causes no shift.
 * A full salon day is 18 half-hour slots.
 */
export function SlotGridSkeleton({ cells = 18 }: { cells?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-hidden>
      {Array.from({ length: cells }).map((_, i) => (
        <div
          key={i}
          className={cn(
            CELL,
            "border-transparent bg-surface-sunken motion-safe:animate-pulse",
          )}
          style={{ animationDelay: `${(i % 3) * 90}ms` }}
        >
          &nbsp;
        </div>
      ))}
    </div>
  );
}

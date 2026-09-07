"use client";

import { cn } from "@/lib/cn";
import { formatSlotTime } from "@/lib/format";

const CELL = "rounded-[var(--radius-sm)] border py-2.5 text-[14px] font-bold";

export function SlotGrid({
  times,
  available,
  value,
  onChange,
}: {
  /** Every candidate start time for the day, as epoch millis. */
  times: number[];
  /** The subset that can actually be booked. */
  available: Set<number>;
  value: number | null;
  onChange: (t: number) => void;
}) {
  if (times.length === 0) return null;
  return (
    <div role="group" aria-label="Choose a time" className="grid grid-cols-3 gap-2">
      {times.map((t) => {
        const active = t === value;
        const open = available.has(t);
        return (
          <button
            key={t}
            type="button"
            onClick={() => open && onChange(t)}
            disabled={!open}
            aria-pressed={active}
            className={cn(
              CELL,
              "transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
              !open &&
                "cursor-not-allowed border-border-default bg-surface-sunken text-text-tertiary line-through",
              open &&
                !active &&
                "border-border-default bg-surface-card text-text-primary hover:border-brand-hover motion-safe:active:scale-[0.96]",
              active && "border-brand bg-brand text-text-on-brand",
            )}
          >
            {formatSlotTime(t)}
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

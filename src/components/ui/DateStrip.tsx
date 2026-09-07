"use client";

import { useCallback } from "react";
import { addDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/cn";

export function DateStrip({
  value,
  onChange,
  days = 14,
  from = new Date(),
  isEnabled,
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  days?: number;
  from?: Date;
  /** Return false for days the salon is closed — shown muted + not selectable. */
  isEnabled?: (d: Date) => boolean;
}) {
  const list = Array.from({ length: days }, (_, i) => addDays(from, i));

  // Bring a pre-selected (deep-linked) day into view instead of leaving it off-screen.
  const revealSelected = useCallback((node: HTMLButtonElement | null) => {
    node?.scrollIntoView({ block: "nearest", inline: "center" });
  }, []);

  return (
    <div
      role="group"
      aria-label="Choose a date"
      className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]"
    >
      {list.map((d) => {
        const active = value ? isSameDay(d, value) : false;
        const enabled = isEnabled ? isEnabled(d) : true;
        return (
          <button
            key={d.toISOString()}
            ref={active ? revealSelected : undefined}
            onClick={() => enabled && onChange(d)}
            disabled={!enabled}
            aria-pressed={active}
            className={cn(
              "flex w-14 shrink-0 snap-start flex-col items-center gap-1 rounded-[var(--radius-md)] border py-2.5 transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
              !enabled &&
                "cursor-not-allowed border-border-default bg-surface-sunken text-text-tertiary",
              enabled &&
                !active &&
                "border-border-default bg-surface-card text-text-primary hover:border-brand-hover motion-safe:active:scale-[0.96]",
              active && "border-brand bg-brand text-text-on-brand",
            )}
          >
            <span className="text-[12px] font-medium opacity-80">{format(d, "EEE")}</span>
            <span className="text-[16px] font-bold">{format(d, "d")}</span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import { segmentedTrack, segmentedItem, segmentedItemIdle } from "./segmented";

export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  );
  const n = tabs.length;
  return (
    <div role="tablist" className={cn(segmentedTrack, "relative", className)}>
      {/* Sliding pill: same width as one tab (track padding p-1, gap-1), moved
          by whole tab-widths + gaps so it glides instead of jumping. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-1 rounded-[6px] bg-surface-card shadow-[var(--shadow-sm)] transition-transform duration-250 ease-[var(--ease-out)]"
        style={{
          width: `calc((100% - 0.5rem - ${n - 1} * 0.25rem) / ${n})`,
          transform: `translateX(calc(${index} * (100% + 0.25rem)))`,
        }}
      />
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            segmentedItem,
            "relative",
            value === t.value ? "text-text-primary" : segmentedItemIdle,
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Step indicator for the booking flow: numbered stubs joined by a dotted
 * perforation. Done steps carry a stamped check and become buttons when
 * `onStepClick` is given, so the user can jump back to an earlier step.
 */
export function StepTabs({
  steps,
  current,
  onStepClick,
}: {
  steps: string[];
  current: number;
  onStepClick?: (index: number) => void;
}) {
  return (
    <ol className="flex">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = done && !!onStepClick;
        const Inner = (
          <>
            <span
              className={cn(
                "relative z-10 mx-auto grid size-7 place-items-center rounded-full text-caption font-bold ring-4 ring-surface-card transition-colors duration-200 ease-[var(--ease-out)]",
                done && "bg-brand text-text-on-brand",
                active && "bg-[var(--neutral-900)] text-white",
                !done &&
                  !active &&
                  "border-2 border-dashed border-border-strong bg-surface-card text-text-tertiary",
              )}
            >
              {done ? (
                <Check size={14} strokeWidth={3} aria-hidden />
              ) : (
                <span aria-hidden>{i + 1}</span>
              )}
            </span>
            <span
              className={cn(
                "mt-1.5 block text-caption font-bold",
                active
                  ? "text-text-primary"
                  : done
                    ? "text-text-secondary"
                    : "text-text-tertiary",
                clickable && "group-hover:text-brand",
              )}
            >
              {s}
            </span>
          </>
        );
        return (
          <li
            key={s}
            className={cn(
              "relative flex-1 text-center",
              // Dotted stretch back to the previous stub. It runs between the two
              // badges' edges (radius 0.875rem + a 0.375rem gap each side), never
              // through them, so it can't cross a number.
              i > 0 &&
                "before:absolute before:left-[calc(-50%+1.25rem)] before:right-[calc(50%+1.25rem)] before:top-3 before:border-t-4 before:border-dotted",
              i > 0 && (done || active ? "before:border-brand" : "before:border-border-strong"),
            )}
          >
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick(i)}
                aria-label={`Back to ${s}`}
                className="group block w-full rounded-[6px] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
              >
                {Inner}
              </button>
            ) : (
              <div aria-current={active ? "step" : undefined}>{Inner}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}

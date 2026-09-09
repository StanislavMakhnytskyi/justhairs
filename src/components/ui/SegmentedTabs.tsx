"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  segmentedTrack,
  segmentedItem,
  segmentedItemActive,
  segmentedItemIdle,
} from "./segmented";

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
  return (
    <div role="tablist" className={cn(segmentedTrack, className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            segmentedItem,
            value === t.value ? segmentedItemActive : segmentedItemIdle,
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Step indicator for the booking flow. Completed steps become buttons when
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
    <ol className="flex gap-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        const clickable = done && !!onStepClick;
        const Inner = (
          <>
            <span
              className={cn(
                "block h-1 rounded-full",
                done || active ? "bg-brand" : "bg-border-default",
              )}
            />
            <span
              className={cn(
                "mt-2 flex items-center gap-1 text-caption font-bold",
                active
                  ? "text-text-primary"
                  : done
                    ? "text-text-secondary"
                    : "text-text-tertiary",
                clickable && "group-hover:text-brand",
              )}
            >
              {done && (
                <Check
                  size={12}
                  strokeWidth={3}
                  className="shrink-0 text-brand"
                  aria-hidden
                />
              )}
              {s}
            </span>
          </>
        );
        return (
          <li key={s} className="flex-1">
            {clickable ? (
              <button
                type="button"
                onClick={() => onStepClick(i)}
                aria-label={`Back to ${s}`}
                className="group block w-full rounded-[6px] text-left focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-4"
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

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

/** Non-interactive step indicator for the booking flow. */
export function StepTabs({
  steps,
  current,
}: {
  steps: string[];
  current: number;
}) {
  return (
    <div className="flex gap-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s} className="flex-1">
            <div
              className={cn(
                "h-1 rounded-full",
                done && "bg-brand",
                active && "bg-brand",
                !done && !active && "bg-border-default",
              )}
            />
            <p
              className={cn(
                "mt-2 flex items-center gap-1 text-caption font-bold",
                active
                  ? "text-text-primary"
                  : done
                    ? "text-text-secondary"
                    : "text-text-tertiary",
              )}
            >
              {done && (
                <Check size={12} strokeWidth={3} className="shrink-0 text-brand" aria-hidden />
              )}
              {s}
            </p>
          </div>
        );
      })}
    </div>
  );
}

"use client";

import { cn } from "@/lib/cn";

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
    <div
      role="tablist"
      className={cn(
        "flex gap-1 rounded-[var(--radius-sm)] bg-surface-sunken p-1",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            "flex-1 rounded-[6px] px-3 py-2 text-[13px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
            value === t.value
              ? "bg-surface-card text-text-primary shadow-[var(--shadow-card)]"
              : "text-text-secondary hover:text-text-primary",
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
      {steps.map((s, i) => (
        <div key={s} className="flex-1">
          <div
            className={cn(
              "h-1 rounded-full",
              i <= current ? "bg-brand" : "bg-border-default",
            )}
          />
          <p
            className={cn(
              "mt-2 text-[12px] font-bold",
              i === current ? "text-text-primary" : "text-text-tertiary",
            )}
          >
            {s}
          </p>
        </div>
      ))}
    </div>
  );
}

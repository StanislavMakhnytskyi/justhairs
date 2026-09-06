"use client";

import { cn } from "@/lib/cn";
import { formatSlotTime } from "@/lib/format";

export function SlotGrid({
  slots,
  value,
  onChange,
}: {
  slots: string[]; // ISO timestamps
  value: string | null;
  onChange: (iso: string) => void;
}) {
  if (slots.length === 0) {
    return (
      <p className="rounded-[var(--radius-md)] bg-surface-sunken px-4 py-6 text-center text-[13px] text-text-secondary">
        No open times on this day. Try another date.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map((iso) => {
        const active = iso === value;
        const label = formatSlotTime(iso);
        return (
          <button
            key={iso}
            onClick={() => onChange(iso)}
            className={cn(
              "rounded-[var(--radius-sm)] border py-2.5 text-[14px] font-bold transition-colors",
              active
                ? "border-brand bg-brand text-text-on-brand"
                : "border-border-default bg-surface-card text-text-primary",
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import { addDays, format, isSameDay } from "date-fns";
import { cn } from "@/lib/cn";

export function DateStrip({
  value,
  onChange,
  days = 14,
  from = new Date(),
}: {
  value: Date | null;
  onChange: (d: Date) => void;
  days?: number;
  from?: Date;
}) {
  const list = Array.from({ length: days }, (_, i) => addDays(from, i));
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
      {list.map((d) => {
        const active = value && isSameDay(d, value);
        return (
          <button
            key={d.toISOString()}
            onClick={() => onChange(d)}
            className={cn(
              "flex w-14 shrink-0 flex-col items-center gap-1 rounded-[var(--radius-md)] border py-2.5 transition-colors",
              active
                ? "border-brand bg-brand text-text-on-brand"
                : "border-border-default bg-surface-card text-text-primary",
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

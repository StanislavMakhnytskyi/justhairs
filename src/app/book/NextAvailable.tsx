"use client";

import { Skeleton } from "@/components/ui/Skeleton";
import { formatSlotTime, SALON_TZ } from "@/lib/format";

/** "Thu 6 · 10:00" — weekday and date number, so two Thursdays can't be confused. */
function formatQuickPick(iso: string): string {
  const day = new Date(iso).toLocaleDateString("en-IE", {
    weekday: "short",
    day: "numeric",
    timeZone: SALON_TZ,
  });
  return `${day} · ${formatSlotTime(iso)}`;
}

/** "Thursday 6 November, 10:00" — the chip's spoken name. */
function speakQuickPick(iso: string): string {
  const day = new Date(iso).toLocaleDateString("en-IE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: SALON_TZ,
  });
  return `${day}, ${formatSlotTime(iso)}`;
}

const CHIP =
  "inline-flex min-h-11 items-center rounded-[var(--radius-pill)] border px-4 text-label font-bold";

/** The earliest few bookable times across the coming days, one tap each. */
export function NextAvailable({
  label,
  picks,
  onPick,
}: {
  label: string;
  picks: { day: string; iso: string }[];
  onPick: (day: string, iso: string) => void;
}) {
  if (picks.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-label font-bold text-text-secondary">{label}</p>
      <div role="group" aria-label={label} className="flex flex-wrap gap-2">
        {picks.map((q) => (
          <button
            key={q.iso}
            type="button"
            onClick={() => onPick(q.day, q.iso)}
            aria-label={speakQuickPick(q.iso)}
            className={`${CHIP} border-border-strong bg-surface-card text-text-primary transition-[color,border-color,transform] duration-150 ease-[var(--ease-out)] hover:border-brand motion-safe:active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2`}
          >
            {formatQuickPick(q.iso)}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Same geometry as NextAvailable, shown while the warm cache is still
 *  filling in — so the chips don't just pop in with a layout jump. The caller
 *  time-boxes it: it never shimmers for longer than the lookup deserves. */
export function NextAvailableSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="mb-2 h-4 w-28" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-11 w-32 rounded-[var(--radius-pill)]"
            style={{ animationDelay: `${i * 90}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

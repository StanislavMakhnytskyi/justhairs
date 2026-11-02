"use client";

import { useSyncExternalStore } from "react";
import { Clock } from "lucide-react";
import { formatSlotTime } from "@/lib/format";

const TICK_MS = 15_000;

function subscribe(onChange: () => void) {
  const t = setInterval(onChange, TICK_MS);
  return () => clearInterval(t);
}
// Quantised so the snapshot is stable between ticks (useSyncExternalStore
// requires an unchanged value for unchanged state).
const getNow = () => Math.floor(Date.now() / TICK_MS) * TICK_MS;
const getServerNow = () => null;

/**
 * How long the slot stays held. The server passes the deadline (see the pay
 * page); the absolute time renders on the server, the "n min left" part only
 * once the client clock is known, so nothing mismatches on hydration. Not a
 * live region: a ticking announcement every 15 s would drown a screen reader.
 */
export function HoldNotice({ until }: { until: string }) {
  const end = Date.parse(until);
  const now = useSyncExternalStore(subscribe, getNow, getServerNow);
  const left = now === null ? null : Math.ceil((end - now) / 60_000);
  const lapsed = left !== null && left <= 0;

  return (
    <p className="flex items-start gap-2.5 rounded-[var(--radius-sm)] bg-surface-sunken px-3 py-2.5 text-label text-text-secondary">
      <Clock size={16} className="mt-0.5 shrink-0" aria-hidden />
      {lapsed ? (
        <span>
          This hold has run out. If paying doesn&rsquo;t go through, go back and pick the time
          again.
        </span>
      ) : (
        <span>
          We&rsquo;re holding this time until{" "}
          <strong className="font-bold text-text-primary">{formatSlotTime(end)}</strong>
          {left !== null && ` · about ${left} min left`}. Unfinished bookings are released
          after that.
        </span>
      )}
    </p>
  );
}

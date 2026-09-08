import { getAvailableSlots, getDayAvailability } from "@/lib/actions/booking";
import { SALON_TZ } from "@/lib/salon";

/** Salon-local calendar day (yyyy-mm-dd) of an ISO timestamp. */
function salonDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: SALON_TZ });
}

/**
 * A tiny client-side cache of availability lookups, exposed as an external
 * store so `useSyncExternalStore` can read it during render without a ref.
 * Keyed by service+staff+day; results are safe to keep for the life of the
 * session (the booking RPC re-checks availability at commit time).
 */
const map = new Map<string, string[]>();
const listeners = new Set<() => void>();

export function slotCacheKey(
  serviceId: string,
  staffId: string | null,
  day: string,
): string {
  return `${serviceId}:${staffId ?? "any"}:${day}`;
}

export function getCachedSlots(key: string): string[] | undefined {
  return map.get(key);
}

export function subscribeSlotCache(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/**
 * Warm the cache for a set of days in a single round trip. `days` must be the
 * exact yyyy-mm-dd list the UI will look up, so days that come back with no
 * slots are still cached as `[]` (and read as "closed / full").
 */
export async function loadWindow(
  serviceId: string,
  staffId: string | null,
  days: string[],
): Promise<void> {
  if (days.length === 0) return;
  const missing = days.filter(
    (d) => !map.has(slotCacheKey(serviceId, staffId, d)),
  );
  if (missing.length === 0) return;

  const all = await getDayAvailability({
    serviceId,
    staffId: staffId === "any" ? null : staffId,
    from: missing[0],
    days:
      Math.round(
        (Date.parse(`${missing[missing.length - 1]}T00:00:00Z`) -
          Date.parse(`${missing[0]}T00:00:00Z`)) /
          86_400_000,
      ) + 1,
  });

  const byDay = new Map<string, string[]>();
  for (const iso of all) {
    const d = salonDay(iso);
    const list = byDay.get(d);
    if (list) list.push(iso);
    else byDay.set(d, [iso]);
  }
  for (const d of days) {
    map.set(slotCacheKey(serviceId, staffId, d), byDay.get(d) ?? []);
  }
  listeners.forEach((l) => l());
}

/** Return cached slots, or fetch + cache them and notify subscribers. */
export async function loadSlots(
  serviceId: string,
  staffId: string | null,
  day: string,
): Promise<string[]> {
  const key = slotCacheKey(serviceId, staffId, day);
  const hit = map.get(key);
  if (hit) return hit;
  const result = await getAvailableSlots({
    serviceId,
    staffId: staffId === "any" ? null : staffId,
    day,
  });
  map.set(key, result);
  listeners.forEach((l) => l());
  return result;
}

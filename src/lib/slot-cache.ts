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

/** Bumped by `invalidateDay`, per service+day. A fetch remembers the epoch it
 *  started in and drops its result if it moved, so a stale in-flight response
 *  can't repopulate a day that was just cleared. */
const epochs = new Map<string, number>();
function epochOf(serviceId: string, day: string): number {
  return epochs.get(`${serviceId}:${day}`) ?? 0;
}

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
 * Forget every cached lookup for one service on one day (any staff, including
 * "any") — e.g. after the booking RPC reports the slot was just taken, so the
 * next read re-fetches what is really still open.
 */
export function invalidateDay(serviceId: string, day: string): void {
  epochs.set(`${serviceId}:${day}`, epochOf(serviceId, day) + 1);
  let changed = false;
  for (const key of map.keys()) {
    if (key.startsWith(`${serviceId}:`) && key.endsWith(`:${day}`)) {
      map.delete(key);
      changed = true;
    }
  }
  if (changed) listeners.forEach((l) => l());
}

/**
 * Warm the cache for a set of days in a single round trip. `days` must be the
 * exact yyyy-mm-dd list the UI will look up, so days that come back with no
 * slots are still cached as `[]` (and read as "closed / full").
 */
// TODO (CODE_REVIEW.md #11): no in-flight-request dedup — two calls for
// overlapping day ranges (e.g. staff toggled quickly) each compute `missing`
// from the same snapshot before either awaits, so both hit the network for
// the same days. The per-key "don't clobber" guard below stops them from
// corrupting each other's writes, but not from duplicating the fetch itself.
export async function loadWindow(
  serviceId: string,
  staffId: string | null,
  days: string[],
): Promise<void> {
  if (days.length === 0) return;
  const sid = staffId === "any" ? null : staffId;
  const missing = days.filter(
    (d) => !map.has(slotCacheKey(serviceId, staffId, d)),
  );
  if (missing.length === 0) return;
  const epochs = new Map(missing.map((d) => [d, epochOf(serviceId, d)]));

  try {
    const all = await getDayAvailability({
      serviceId,
      staffId: sid,
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
    // Only write the days we actually set out to fill, and only if nothing
    // else cached them while this request was in flight — NOT the full
    // `days` list. The RPC range only spans `missing`, so writing every day
    // in `days` wiped out already-correct entries (e.g. the currently viewed
    // date, warmed a moment earlier by a direct loadSlots call) back to `[]`,
    // which flipped a day with real slots to "disabled" in the date strip.
    for (const d of missing) {
      const key = slotCacheKey(serviceId, staffId, d);
      if (map.has(key)) continue;
      // invalidateDay ran while this response was in flight: it is stale.
      if (epochOf(serviceId, d) !== epochs.get(d)) continue;
      map.set(key, byDay.get(d) ?? []);
    }
    listeners.forEach((l) => l());
  } catch {
    // The window lookup failed. Deliberately NO per-day fallback loop: Next
    // serialises server actions, so a loop would queue behind itself and block
    // the viewed day's own lookup. Days stay unknown (the strip leaves them
    // enabled, "Next available" times out) and the viewed day loads via
    // `loadSlots`, one call.
  }
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
  const epoch = epochOf(serviceId, day);
  const result = await getAvailableSlots({
    serviceId,
    staffId: staffId === "any" ? null : staffId,
    day,
  });
  // A response that predates an invalidateDay must not repopulate the day.
  // Hand the caller a fresh lookup instead (one retry, one call).
  if (epochOf(serviceId, day) !== epoch) {
    return getAvailableSlots({
      serviceId,
      staffId: staffId === "any" ? null : staffId,
      day,
    }).then((fresh) => {
      if (!map.has(key)) {
        map.set(key, fresh);
        listeners.forEach((l) => l());
      }
      return fresh;
    });
  }
  map.set(key, result);
  listeners.forEach((l) => l());
  return result;
}

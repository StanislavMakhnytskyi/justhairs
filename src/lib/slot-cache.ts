import { getAvailableSlots } from "@/lib/actions/booking";

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

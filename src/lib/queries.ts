import { cache } from "react";
import { createPublicClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { SERVICE_PHOTOS, STAFF_PHOTOS } from "@/lib/photos.generated";
import type { Service, ServiceCategory, Staff } from "@/lib/supabase/types";

export type ServiceWithCategory = Service & { category: ServiceCategory };

export type WorkingHour = {
  staff_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

/** The photograph chosen for a service or stylist (scripts/prepare-photos.mjs,
 *  committed in public/images) replaces whatever photo_url the database holds, so
 *  every service and stylist has a picture of the same look without touching the
 *  live data. Slugs we have no photo for keep their stored URL. */
function withPhoto<T extends { slug: string; photo_url: string | null }>(
  item: T,
  photos: Record<string, { src: string }>,
): T {
  const photo = photos[item.slug];
  return photo ? { ...item, photo_url: photo.src } : item;
}
const withServicePhoto = <T extends { slug: string; photo_url: string | null }>(s: T) =>
  withPhoto(s, SERVICE_PHOTOS);
const withStaffPhoto = <T extends { slug: string; photo_url: string | null }>(s: T) =>
  withPhoto(s, STAFF_PHOTOS);

const EMPTY_CATALOG = {
  categories: [] as ServiceCategory[],
  services: [] as ServiceWithCategory[],
  staff: [] as Staff[],
  staffServices: [] as { staff_id: string; service_id: string }[],
  workingHours: [] as WorkingHour[],
};

type Failure = { message: string } | null;

/** Throw on a Supabase error so the caller's catch logs it and falls back —
 *  instead of an RLS or grant mistake silently turning into an empty catalog. */
function rows<T>(label: string, res: { data: T[] | null; error: Failure }): T[] {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data ?? [];
}
function row<D>(label: string, res: { data: D; error: Failure }): D {
  if (res.error) throw new Error(`${label}: ${res.error.message}`);
  return res.data;
}

// React `cache` dedupes calls within one render pass (e.g. generateMetadata and
// the page both asking for the same service); ISR still handles the rest.
export const getCatalog = cache(async () => {
  if (!isSupabaseConfigured) return EMPTY_CATALOG;
  try {
    const supabase = createPublicClient();
    const [categories, services, staff, links, hours] = await Promise.all([
      supabase.from("service_categories").select("*").order("sort"),
      supabase
        .from("services")
        .select("*, category:service_categories(*)")
        .eq("active", true)
        .order("price_cents"),
      supabase.from("staff").select("*").eq("active", true).order("name"),
      supabase.from("staff_services").select("staff_id, service_id"),
      supabase.from("staff_working_hours").select("staff_id, weekday, start_time, end_time"),
    ]);
    return {
      categories: rows("service_categories", categories),
      services: rows("services", services).map(withServicePhoto),
      staff: rows("staff", staff).map(withStaffPhoto),
      staffServices: rows("staff_services", links),
      workingHours: rows("staff_working_hours", hours),
    };
  } catch (e) {
    console.error("[supabase] getCatalog failed:", e);
    return EMPTY_CATALOG;
  }
});

export const getServiceBySlug = cache(async (slug: string) => {
  if (!isSupabaseConfigured) return null;
  try {
    const service = row(
      "services by slug",
      await createPublicClient()
        .from("services")
        .select("*, category:service_categories(*)")
        .eq("slug", slug)
        .eq("active", true)
        .maybeSingle(),
    );
    return service ? withServicePhoto(service) : null;
  } catch (e) {
    console.error("[supabase] getServiceBySlug failed:", e);
    return null;
  }
});

export async function getStaffForService(serviceId: string) {
  if (!isSupabaseConfigured) return [];
  try {
    const links = rows(
      "staff for service",
      await createPublicClient()
        .from("staff_services")
        .select("staff:staff(*)")
        .eq("service_id", serviceId),
    );
    return links
      .map((r) => r.staff)
      .filter((s): s is Staff => !!s && s.active)
      .map(withStaffPhoto);
  } catch (e) {
    console.error("[supabase] getStaffForService failed:", e);
    return [];
  }
}

export async function getOpenWeekdays(): Promise<number[]> {
  const fallback = [2, 3, 4, 5, 6];
  if (!isSupabaseConfigured) return fallback;
  try {
    const hours = rows("working hours", await createPublicClient().from("staff_working_hours").select("weekday"));
    const days = [...new Set(hours.map((r) => r.weekday))];
    return days.length ? days : fallback;
  } catch (e) {
    console.error("[supabase] getOpenWeekdays failed:", e);
    return fallback;
  }
}

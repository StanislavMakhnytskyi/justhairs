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

export async function getCatalog() {
  if (!isSupabaseConfigured) return EMPTY_CATALOG;
  try {
    const supabase = createPublicClient();
    const [
      { data: categories },
      { data: services },
      { data: staff },
      { data: links },
      { data: hours },
    ] = await Promise.all([
      supabase.from("service_categories").select("*").order("sort"),
      supabase
        .from("services")
        .select("*, category:service_categories(*)")
        .eq("active", true)
        .order("price_cents"),
      supabase.from("staff").select("*").eq("active", true).order("name"),
      supabase.from("staff_services").select("staff_id, service_id"),
      supabase
        .from("staff_working_hours")
        .select("staff_id, weekday, start_time, end_time"),
    ]);
    return {
      categories: (categories ?? []) as ServiceCategory[],
      // KNOWN ISSUE (CODE_REVIEW.md #10): the double-cast through `unknown`
      // trusts the category embed's shape at compile time only — if it ever
      // comes back null or as an array (Supabase's FK-cardinality inference
      // can do that) this fails silently at render time, not here.
      services: ((services ?? []) as unknown as ServiceWithCategory[]).map(withServicePhoto),
      staff: ((staff ?? []) as Staff[]).map(withStaffPhoto),
      staffServices: (links ?? []) as { staff_id: string; service_id: string }[],
      workingHours: (hours ?? []) as WorkingHour[],
    };
  } catch {
    return EMPTY_CATALOG;
  }
}

export async function getServiceBySlug(slug: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("services")
      .select("*, category:service_categories(*)")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    const row = data as unknown as ServiceWithCategory | null;
    return row ? withServicePhoto(row) : null;
  } catch {
    return null;
  }
}

export async function getStaffForService(serviceId: string) {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("staff_services")
      .select("staff:staff(*)")
      .eq("service_id", serviceId);
    return (
      (data ?? []).map((r) => r.staff).filter(Boolean) as unknown as Staff[]
    )
      .filter((s) => s.active)
      .map(withStaffPhoto);
  } catch {
    return [];
  }
}

export async function getOpenWeekdays(): Promise<number[]> {
  const fallback = [2, 3, 4, 5, 6];
  if (!isSupabaseConfigured) return fallback;
  try {
    const supabase = createPublicClient();
    const { data } = await supabase
      .from("staff_working_hours")
      .select("weekday");
    const set = [...new Set((data ?? []).map((r) => r.weekday as number))];
    return set.length ? set : fallback;
  } catch {
    return fallback;
  }
}

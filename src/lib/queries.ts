import { createClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Service, ServiceCategory, Staff } from "@/lib/supabase/types";

export type ServiceWithCategory = Service & { category: ServiceCategory };

const EMPTY_CATALOG = {
  categories: [] as ServiceCategory[],
  services: [] as ServiceWithCategory[],
  staff: [] as Staff[],
  staffServices: [] as { staff_id: string; service_id: string }[],
};

export async function getCatalog() {
  if (!isSupabaseConfigured) return EMPTY_CATALOG;
  try {
    const supabase = await createClient();
    const [{ data: categories }, { data: services }, { data: staff }, { data: links }] =
      await Promise.all([
        supabase.from("service_categories").select("*").order("sort"),
        supabase
          .from("services")
          .select("*, category:service_categories(*)")
          .eq("active", true)
          .order("price_cents"),
        supabase.from("staff").select("*").eq("active", true).order("name"),
        supabase.from("staff_services").select("staff_id, service_id"),
      ]);
    return {
      categories: (categories ?? []) as ServiceCategory[],
      services: (services ?? []) as unknown as ServiceWithCategory[],
      staff: (staff ?? []) as Staff[],
      staffServices: (links ?? []) as { staff_id: string; service_id: string }[],
    };
  } catch {
    return EMPTY_CATALOG;
  }
}

export async function getServiceBySlug(slug: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("services")
      .select("*, category:service_categories(*)")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle();
    return (data as unknown as ServiceWithCategory) ?? null;
  } catch {
    return null;
  }
}

export async function getStaffForService(serviceId: string) {
  if (!isSupabaseConfigured) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("staff_services")
      .select("staff:staff(*)")
      .eq("service_id", serviceId);
    return (
      (data ?? []).map((r) => r.staff).filter(Boolean) as unknown as Staff[]
    ).filter((s) => s.active);
  } catch {
    return [];
  }
}

export async function getCurrentProfile() {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    return data ?? null;
  } catch {
    return null;
  }
}

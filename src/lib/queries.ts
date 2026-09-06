import { createClient } from "@/lib/supabase/server";
import type { Service, ServiceCategory, Staff } from "@/lib/supabase/types";

export type ServiceWithCategory = Service & { category: ServiceCategory };

export async function getCatalog() {
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
}

export async function getServiceBySlug(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*, category:service_categories(*)")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  return (data as unknown as ServiceWithCategory) ?? null;
}

export async function getStaffForService(serviceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_services")
    .select("staff:staff(*)")
    .eq("service_id", serviceId);
  return ((data ?? []).map((r) => r.staff).filter(Boolean) as unknown as Staff[]).filter(
    (s) => s.active,
  );
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data ?? null;
}

import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { Appointment, Service, Staff } from "@/lib/supabase/types";

export type AppointmentDetail = Appointment & {
  service: Pick<Service, "id" | "name" | "slug" | "duration_min">;
  staff: Pick<Staff, "id" | "name" | "title"> | null;
};

const SELECT =
  "*, service:services(id,name,slug,duration_min), staff:staff(id,name,title)";

/**
 * One appointment by id, for the payment + confirmation pages. Appointments
 * carry the guest's contact details, so this uses the service-role key (anon
 * has no read access) — only ever called server-side with an id from the URL.
 */
export async function getAppointment(id: string) {
  if (!isSupabaseConfigured) return null;
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("appointments")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    return (data as AppointmentDetail | null) ?? null;
  } catch {
    return null;
  }
}

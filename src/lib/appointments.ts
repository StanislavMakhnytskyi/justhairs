import { createClient } from "@/lib/supabase/server";
import type { Appointment, Service, Staff } from "@/lib/supabase/types";

export type AppointmentDetail = Appointment & {
  service: Pick<Service, "id" | "name" | "slug" | "duration_min">;
  staff: Pick<Staff, "id" | "name" | "title"> | null;
};

const SELECT = "*, service:services(id,name,slug,duration_min), staff:staff(id,name,title)";

export async function getAppointment(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("appointments").select(SELECT).eq("id", id).maybeSingle();
  return (data as unknown as AppointmentDetail) ?? null;
}

export async function listMyAppointments() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select(SELECT)
    .order("starts_at", { ascending: true });
  return (data ?? []) as unknown as AppointmentDetail[];
}

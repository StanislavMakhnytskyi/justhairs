import { createClient } from "@/lib/supabase/server";
import type { Appointment, Review, Service, Staff } from "@/lib/supabase/types";

export type AppointmentDetail = Appointment & {
  service: Pick<Service, "id" | "name" | "slug" | "duration_min">;
  staff: Pick<Staff, "id" | "name" | "title"> | null;
  review: Pick<Review, "rating" | "comment"> | null;
};

const SELECT =
  "*, service:services(id,name,slug,duration_min), staff:staff(id,name,title), review:reviews(rating,comment)";

function normalize(row: Record<string, unknown>): AppointmentDetail {
  const review = row.review;
  return {
    ...(row as unknown as AppointmentDetail),
    review: Array.isArray(review) ? (review[0] ?? null) : (review ?? null),
  };
}

export async function getAppointment(id: string) {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("appointments")
      .select(SELECT)
      .eq("id", id)
      .maybeSingle();
    return data ? normalize(data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function listMyAppointments() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("appointments")
      .select(SELECT)
      .order("starts_at", { ascending: true });
    return (data ?? []).map((r) => normalize(r as Record<string, unknown>));
  } catch {
    return [];
  }
}

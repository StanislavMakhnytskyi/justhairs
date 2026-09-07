import type { Master } from "@/components/ui/MasterCard";
import { summariseHours } from "./salon";
import type { Rating, Staff } from "./supabase/types";
import type { WorkingHour } from "./queries";

/** Assemble rich stylist tiles from the flat catalog data. */
export function buildMasters(
  staff: Staff[],
  staffServices: { staff_id: string; service_id: string }[],
  services: { id: string; name: string }[],
  workingHours: WorkingHour[],
  ratings: Record<string, Rating>,
): Master[] {
  const serviceName = new Map(services.map((s) => [s.id, s.name]));
  return staff.map((s) => ({
    id: s.id,
    name: s.name,
    title: s.title,
    bio: s.bio,
    photo_url: s.photo_url,
    specialties: [
      ...new Set(
        staffServices
          .filter((l) => l.staff_id === s.id)
          .map((l) => serviceName.get(l.service_id))
          .filter((n): n is string => !!n),
      ),
    ],
    hours: summariseHours(workingHours.filter((h) => h.staff_id === s.id)),
    rating: ratings[s.id],
  }));
}

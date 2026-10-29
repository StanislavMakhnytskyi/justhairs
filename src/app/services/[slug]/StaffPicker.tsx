"use client";

import { useSearchParams } from "next/navigation";
import { StaffCard } from "@/components/ui/StaffCard";
import type { Staff } from "@/lib/supabase/types";

/** Reads ?staff= (carried over from /masters or the services list) to
 *  pre-highlight that stylist among the ones offering this service. */
export function StaffPicker({ slug, staff }: { slug: string; staff: Staff[] }) {
  const params = useSearchParams();
  const selected = params.get("staff");

  return (
    <div className="flex flex-col">
      {staff.map((s) => (
        <StaffCard
          key={s.id}
          name={s.name}
          subtitle={s.title}
          photoUrl={s.photo_url}
          selected={s.id === selected}
          href={`/book?service=${slug}&staff=${s.id}&step=date`}
        />
      ))}
    </div>
  );
}

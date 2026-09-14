"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Stack } from "@/components/ui/Section";
import { ShopService } from "@/components/ui/ShopService";
import { TextLink } from "@/components/ui/TextLink";
import { EmptyState } from "@/components/ui/primitives";
import type { ServiceWithCategory } from "@/lib/queries";
import type { Staff } from "@/lib/supabase/types";

type Gender = "men" | "women";

export function ServiceCategoryTabs({
  men,
  women,
  staff,
  staffServices,
}: {
  men: ServiceWithCategory[];
  women: ServiceWithCategory[];
  staff: Staff[];
  staffServices: { staff_id: string; service_id: string }[];
}) {
  const params = useSearchParams();
  const [tab, setTab] = useState<Gender>(
    params.get("category") === "women" ? "women" : "men",
  );

  // Arrived from a stylist's card on /masters — narrow the list to what they
  // offer, and carry them into the service (so "Book" can skip straight to
  // the date step with this stylist already chosen).
  const staffId = params.get("staff");
  const activeStaff = staffId ? staff.find((s) => s.id === staffId) ?? null : null;
  const offeredIds = useMemo(
    () =>
      activeStaff
        ? new Set(
            staffServices.filter((l) => l.staff_id === activeStaff.id).map((l) => l.service_id),
          )
        : null,
    [activeStaff, staffServices],
  );

  const shown = (tab === "women" ? women : men).filter(
    (s) => !offeredIds || offeredIds.has(s.id),
  );

  return (
    <div className="flex flex-col gap-4">
      {activeStaff && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-brand-subtle px-4 py-3">
          <p className="text-label text-text-primary">
            Showing services with <span className="font-bold">{activeStaff.name}</span>
          </p>
          <TextLink href="/services">Clear</TextLink>
        </div>
      )}

      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "men", label: "Men" },
          { value: "women", label: "Women" },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState
          title={activeStaff ? `${activeStaff.name} doesn't offer this yet` : "No services to show yet"}
          description={activeStaff ? "Try the other tab, or clear the filter above." : undefined}
        />
      ) : (
        <Stack gap="sm">
          {shown.map((s) => (
            <ShopService
              key={s.id}
              href={
                activeStaff
                  ? `/services/${s.slug}?staff=${activeStaff.id}`
                  : `/services/${s.slug}`
              }
              name={s.name}
              priceCents={s.price_cents}
              durationMin={s.duration_min}
              description={s.description}
              photoUrl={s.photo_url}
            />
          ))}
        </Stack>
      )}
    </div>
  );
}

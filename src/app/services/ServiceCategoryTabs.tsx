"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
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
  const pathname = usePathname();
  const router = useRouter();

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

  const categoryParamRaw = params.get("category");
  const categoryParam: Gender | null =
    categoryParamRaw === "men" || categoryParamRaw === "women" ? categoryParamRaw : null;
  // A stylist who only offers one gender's services should land on that tab,
  // even though the default (and the fallback below) is "men".
  const staffOnlyOffersWomen =
    !!offeredIds && !men.some((s) => offeredIds.has(s.id)) && women.some((s) => offeredIds.has(s.id));
  const tab: Gender = categoryParam ?? (staffOnlyOffersWomen ? "women" : "men");

  const setTab = useCallback(
    (next: Gender) => {
      const nextParams = new URLSearchParams(params);
      nextParams.set("category", next);
      router.replace(`${pathname}?${nextParams.toString()}`);
    },
    [params, pathname, router],
  );

  const shown = (tab === "women" ? women : men).filter(
    (s) => !offeredIds || offeredIds.has(s.id),
  );

  return (
    <div className="flex flex-col gap-4">
      {activeStaff && (
        <div className="flex items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-brand-subtle px-4 py-3">
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
        <div className="flex flex-col">
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
        </div>
      )}
    </div>
  );
}

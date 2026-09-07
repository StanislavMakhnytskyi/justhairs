"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { Stack } from "@/components/ui/Section";
import { ShopService } from "@/components/ui/ShopService";
import { EmptyState } from "@/components/ui/primitives";
import type { ServiceWithCategory } from "@/lib/queries";

type Gender = "men" | "women";

export function ServiceCategoryTabs({
  men,
  women,
}: {
  men: ServiceWithCategory[];
  women: ServiceWithCategory[];
}) {
  const params = useSearchParams();
  const [tab, setTab] = useState<Gender>(
    params.get("category") === "women" ? "women" : "men",
  );
  const shown = tab === "women" ? women : men;

  return (
    <div className="flex flex-col gap-4">
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "men", label: "Men" },
          { value: "women", label: "Women" },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState title="No services to show yet" />
      ) : (
        <Stack gap="sm">
          {shown.map((s) => (
            <ShopService
              key={s.id}
              href={`/services/${s.slug}`}
              name={s.name}
              priceCents={s.price_cents}
              durationMin={s.duration_min}
              description={s.description}
              photoUrl={s.photo_url}
              action="Book"
            />
          ))}
        </Stack>
      )}
    </div>
  );
}

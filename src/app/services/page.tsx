import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { SegmentedLinks } from "@/components/ui/SegmentedLinks";
import { Stack } from "@/components/ui/Section";
import { ShopService } from "@/components/ui/ShopService";
import { EmptyState } from "@/components/ui/primitives";
import { getCatalog } from "@/lib/queries";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const active = category === "women" ? "women" : "men";
  const { services } = await getCatalog();
  const shown = services.filter((s) => s.category.gender === active);

  return (
    <AppShell>
      <TopBar title="Services" />
      <div className="p-4">
        <SegmentedLinks
          className="mb-4"
          active={active}
          items={[
            { value: "men", label: "Men", href: "/services?category=men" },
            { value: "women", label: "Women", href: "/services?category=women" },
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
    </AppShell>
  );
}

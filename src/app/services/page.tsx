import type { Metadata } from "next";
import { Suspense } from "react";
import { BookShell } from "@/components/ticket/BookShell";
import { TopBar } from "@/components/ui/TopBar";
import { getCatalog } from "@/lib/queries";
import { SegmentedLinks } from "@/components/ui/SegmentedLinks";
import { ShopService } from "@/components/ui/ShopService";
import type { ServiceWithCategory } from "@/lib/queries";
import { ServiceCategoryTabs } from "./ServiceCategoryTabs";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Services",
  description: "Haircuts, colour and styling for men and women at justhairs — see prices and book online.",
  alternates: { canonical: "/services" },
};

function ServiceListFallback({ services }: { services: ServiceWithCategory[] }) {
  return (
    <div className="flex flex-col gap-4">
      <SegmentedLinks
        active="men"
        items={[
          { value: "men", label: "Men", href: "/services?category=men" },
          { value: "women", label: "Women", href: "/services?category=women" },
        ]}
      />
      <div className="flex flex-col">
        {services.map((s) => (
          <ShopService
            key={s.id}
            href={`/services/${s.slug}`}
            name={s.name}
            priceCents={s.price_cents}
            durationMin={s.duration_min}
            description={s.description}
            photoUrl={s.photo_url}
          />
        ))}
      </div>
    </div>
  );
}

export default async function ServicesPage() {
  const { services, staff, staffServices } = await getCatalog();
  const men = services.filter((s) => s.category.gender === "men");
  const women = services.filter((s) => s.category.gender === "women");

  return (
    <BookShell>
      <TopBar title="Services" />
      <div className="p-gutter pb-8">
        {/* useSearchParams() in the tabs suspends during prerender, so the
            server HTML is this fallback: the default (Men) tab as plain links,
            so the service list is in the HTML for crawlers and slow hydration.
            Reading searchParams here instead would make the page dynamic. */}
        <Suspense fallback={<ServiceListFallback services={men} />}>
          <ServiceCategoryTabs
            men={men}
            women={women}
            staff={staff}
            staffServices={staffServices}
          />
        </Suspense>
      </div>
    </BookShell>
  );
}

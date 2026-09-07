import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { ShopService } from "@/components/ui/ShopService";
import { cn } from "@/lib/cn";
import { getCatalog } from "@/lib/queries";

export default async function ServicesPage({
  searchParams,
}: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const active = category === "men" || category === "women" ? category : "men";
  const { services } = await getCatalog();
  const shown = services.filter((s) => s.category.gender === active);

  return (
    <AppShell>
      <TopBar title="Services" />
      <div className="flex gap-1 rounded-[var(--radius-sm)] bg-surface-sunken p-1 mx-4 mt-4">
        {(["men", "women"] as const).map((g) => (
          <Link
            key={g}
            href={`/services?category=${g}`}
            className={cn(
              "flex-1 rounded-[6px] px-3 py-2 text-center text-[13px] font-bold capitalize",
              active === g
                ? "bg-surface-card text-text-primary shadow-[var(--shadow-card)]"
                : "text-text-secondary",
            )}
          >
            {g}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-2 p-4">
        {shown.map((s) => (
          <Link key={s.id} href={`/services/${s.slug}`}>
            <ShopService
              name={s.name}
              priceCents={s.price_cents}
              durationMin={s.duration_min}
              description={s.description}
              photoUrl={s.photo_url}
              action="Book"
            />
          </Link>
        ))}
      </div>
    </AppShell>
  );
}

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Hero } from "@/components/marketing/Hero";
import { Button } from "@/components/ui/Button";
import { Divider, SectionHeader } from "@/components/ui/primitives";
import { ShopService } from "@/components/ui/ShopService";
import { StaffCard } from "@/components/ui/StaffCard";
import { getCatalog } from "@/lib/queries";

export default async function HomePage() {
  const { services, staff } = await getCatalog();
  const men = services.filter((s) => s.category.gender === "men");
  const women = services.filter((s) => s.category.gender === "women");
  const popular = services.filter((s) => s.popular);

  return (
    <AppShell>
      <Hero />

      <ServiceSection title="Men" href="/services?category=men" items={men.slice(0, 3)} />
      <ServiceSection
        title="Women"
        href="/services?category=women"
        items={women.slice(0, 3)}
      />
      <ServiceSection title="Popular" href="/services" items={popular} />

      <section className="px-6 py-6">
        <SectionHeader
          title="Our team"
          action={
            <Link href="/masters" className="text-[13px] font-bold text-link">
              See all
            </Link>
          }
        />
        <div className="flex flex-col gap-2">
          {staff.map((s) => (
            <StaffCard key={s.id} name={s.name} subtitle={s.title} />
          ))}
        </div>
      </section>

      <section className="px-6 py-6">
        <SectionHeader title="Reviews" />
        <div className="rounded-[var(--radius-md)] bg-surface-sunken p-4">
          <p className="text-[15px] font-bold text-rating">★★★★★</p>
          <p className="mt-1 text-[14px] text-text-primary">
            &ldquo;In and out in 40 minutes with the best fade I&rsquo;ve had. Booking
            took seconds.&rdquo;
          </p>
          <p className="mt-2 text-[13px] text-text-secondary">— Jordan R.</p>
        </div>
      </section>

      <section className="px-6 py-6">
        <SectionHeader title="Visit us" />
        <div className="space-y-1 text-[14px] text-text-primary">
          <p>14 Parnell Street, Dublin 1</p>
          <p className="text-text-secondary">Tue–Sat · 9:00–18:00</p>
          <p className="text-text-secondary">Closed Sunday &amp; Monday</p>
        </div>
        <a
          href="https://instagram.com"
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-[13px] font-bold text-link"
        >
          @justhairs on Instagram
        </a>
      </section>

      <Divider />
      <section className="px-6 py-8">
        <Button href="/book" block>
          Book now
        </Button>
      </section>
    </AppShell>
  );
}

function ServiceSection({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: Awaited<ReturnType<typeof getCatalog>>["services"];
}) {
  if (items.length === 0) return null;
  return (
    <section className="px-6 py-6">
      <SectionHeader
        title={title}
        action={
          <Link href={href} className="text-[13px] font-bold text-link">
            See all
          </Link>
        }
      />
      <div className="flex flex-col gap-2">
        {items.map((s) => (
          <Link key={s.id} href={`/services/${s.slug}`}>
            <ShopService
              name={s.name}
              priceCents={s.price_cents}
              durationMin={s.duration_min}
              description={s.description}
              action="Book"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

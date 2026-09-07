import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Hero } from "@/components/marketing/Hero";
import { Map } from "@/components/marketing/Map";
import { Button } from "@/components/ui/Button";
import { Divider, RatingBadge, SectionHeader } from "@/components/ui/primitives";
import { ShopService } from "@/components/ui/ShopService";
import { StaffCard } from "@/components/ui/StaffCard";
import { StarRating } from "@/components/ui/StarRating";
import { getCatalog } from "@/lib/queries";
import { getLatestReviews, getOverallRating, getRatingsMap } from "@/lib/reviews";

export default async function HomePage() {
  const [{ services, staff }, reviews, overall, staffRatings] = await Promise.all([
    getCatalog(),
    getLatestReviews(3),
    getOverallRating(),
    getRatingsMap("staff_ratings"),
  ]);

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
            <StaffCard
              key={s.id}
              name={s.name}
              subtitle={s.title}
              rating={staffRatings[s.id]}
            />
          ))}
        </div>
      </section>

      <section className="px-6 py-6">
        <SectionHeader
          title="Reviews"
          action={
            overall ? (
              <RatingBadge rating={overall.rating} count={overall.review_count} />
            ) : undefined
          }
        />
        {reviews.length > 0 ? (
          <div className="flex flex-col gap-3">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="rounded-[var(--radius-md)] bg-surface-sunken p-4"
              >
                <StarRating value={r.rating} size={16} />
                {r.comment && (
                  <p className="mt-2 text-[14px] text-text-primary">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
                <p className="mt-2 text-[13px] text-text-secondary">
                  — {r.reviewer}
                  {r.service_name ? ` · ${r.service_name}` : ""}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-[var(--radius-md)] bg-surface-sunken p-4 text-[14px] text-text-secondary">
            No reviews yet — be the first after your visit.
          </p>
        )}
      </section>

      <section className="px-6 py-6">
        <SectionHeader title="Visit us" />
        <div className="mb-3 space-y-1 text-[14px] text-text-primary">
          <p>14 Parnell Street, Dublin 1</p>
          <p className="text-text-secondary">Tue–Sat · 9:00–18:00</p>
          <p className="text-text-secondary">Closed Sunday &amp; Monday</p>
        </div>
        <Map />
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
              photoUrl={s.photo_url}
              action="Book"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

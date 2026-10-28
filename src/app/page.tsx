import { AppShell } from "@/components/layout/AppShell";
import { Hero } from "@/components/marketing/Hero";
import { VisitUs } from "@/components/marketing/VisitUs";
import { PageFooter } from "@/components/marketing/PageFooter";
import { Button } from "@/components/ui/Button";
import { Section, Stack } from "@/components/ui/Section";
import { Divider, RatingBadge } from "@/components/ui/primitives";
import { TextLink } from "@/components/ui/TextLink";
import { ShopService } from "@/components/ui/ShopService";
import { MasterCard } from "@/components/ui/MasterCard";
import { ReviewCard } from "@/components/ui/ReviewCard";
import { Hint } from "@/components/ui/Hint";
import { Reveal } from "@/components/ui/Reveal";
import { getCatalog } from "@/lib/queries";
import { buildMasters } from "@/lib/masters";
import { getLatestReviews, getOverallRating, getRatingsMap } from "@/lib/reviews";

// Statically generated, refreshed every 10 minutes.
export const revalidate = 600;

export default async function HomePage() {
  const [{ services, staff, staffServices, workingHours }, reviews, overall, staffRatings] =
    await Promise.all([
      getCatalog(),
      getLatestReviews(3),
      getOverallRating(),
      getRatingsMap("staff_ratings"),
    ]);

  const masters = buildMasters(
    staff,
    staffServices,
    services,
    workingHours,
    staffRatings,
  );

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

      <Section
        title="Our team"
        action={
          masters.length > 3 ? (
            <TextLink href="/masters">See all</TextLink>
          ) : undefined
        }
      >
        <Stack>
          {masters.slice(0, 3).map((m, i) => (
            <Reveal key={m.id} index={i}>
              <MasterCard master={m} href={`/services?staff=${m.id}`} />
            </Reveal>
          ))}
        </Stack>
      </Section>

      <Section
        title="Reviews"
        action={
          overall ? (
            <RatingBadge rating={overall.rating} count={overall.review_count} />
          ) : undefined
        }
      >
        {reviews.length > 0 ? (
          <Stack>
            {reviews.map((r, i) => (
              <Reveal key={r.id} index={i}>
                <ReviewCard
                  rating={r.rating}
                  comment={r.comment}
                  reviewer={r.reviewer}
                  context={r.service_name}
                />
              </Reveal>
            ))}
          </Stack>
        ) : (
          <Hint>No reviews yet — be the first after your visit.</Hint>
        )}
      </Section>

      <VisitUs />

      <Divider />
      <Section>
        <Button href="/book" block>
          Book now
        </Button>
      </Section>

      <PageFooter />
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
    <Section title={title} action={<TextLink href={href}>See all</TextLink>}>
      <Stack gap="sm">
        {items.map((s, i) => (
          <Reveal key={s.id} index={i}>
            <ShopService
              href={`/services/${s.slug}`}
              name={s.name}
              priceCents={s.price_cents}
              durationMin={s.duration_min}
              description={s.description}
              photoUrl={s.photo_url}
            />
          </Reveal>
        ))}
      </Stack>
    </Section>
  );
}

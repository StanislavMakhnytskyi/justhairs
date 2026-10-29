import { HomeShell } from "@/components/layout/HomeShell";
import { Hero } from "@/components/marketing/Hero";
import { HomeNav } from "@/components/marketing/HomeNav";
import { BackOfCard, ReplyCard } from "@/components/home/ClosingCards";
import { MenuSheet, type MenuGroup } from "@/components/home/MenuSheet";
import { ReviewSlips } from "@/components/home/ReviewSlips";
import { TeamTiles } from "@/components/home/TeamTiles";
import { VisitCard } from "@/components/home/VisitCard";
import { getCatalog } from "@/lib/queries";
import { formatDuration, formatPrice } from "@/lib/format";
import { buildMasters } from "@/lib/masters";
import { getLatestReviews, getOverallRating, getRatingsMap } from "@/lib/reviews";

// Statically generated, refreshed every 10 minutes.
export const revalidate = 600;

const HOURS = ["Tue–Sat · 9:00–18:00", "Closed Sunday & Monday"];

export default async function HomePage() {
  const [{ services, staff, staffServices, workingHours }, reviews, overall, staffRatings] =
    await Promise.all([
      getCatalog(),
      getLatestReviews(3),
      getOverallRating(),
      getRatingsMap("staff_ratings"),
    ]);

  const masters = buildMasters(staff, staffServices, services, workingHours, staffRatings);

  const toItem = (s: (typeof services)[number]) => ({
    slug: s.slug,
    name: s.name,
    price: formatPrice(s.price_cents),
    duration: formatDuration(s.duration_min),
    description: s.description,
    photoUrl: s.photo_url,
  });
  const groups: MenuGroup[] = [
    { title: "Men", items: services.filter((s) => s.category.gender === "men").map(toItem) },
    { title: "Women", items: services.filter((s) => s.category.gender === "women").map(toItem) },
  ].filter((g) => g.items.length > 0);

  return (
    <HomeShell>
      <HomeNav />
      <Hero />
      {groups.length > 0 && <MenuSheet groups={groups} hours={HOURS} />}
      {masters.length > 0 && <TeamTiles masters={masters} />}
      <ReviewSlips
        reviews={reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          reviewer: r.reviewer,
          context: r.service_name,
        }))}
        overall={overall}
      />
      <VisitCard hours={HOURS} />
      <ReplyCard />
      <BackOfCard />
    </HomeShell>
  );
}

import type { Metadata } from "next";
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
import {
  openTodayLabel,
  SALON,
  SALON_CLOSE_HOUR,
  SALON_OPEN_HOUR,
  WEEKDAY_LABELS,
} from "@/lib/salon";
import { getSiteUrl } from "@/lib/env";
import { JsonLd } from "@/components/marketing/JsonLd";
import { buildMasters } from "@/lib/masters";
import { getLatestReviews, getOverallRating, getRatingsMap } from "@/lib/reviews";

// Statically generated, refreshed every 10 minutes.
export const revalidate = 600;

export const metadata: Metadata = {
  title: { absolute: "justhairs — book your look" },
  alternates: { canonical: "/" },
};

const FULL_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

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
  const openWeekdays = [...new Set(workingHours.map((h) => h.weekday))].sort();
  const openDays = openWeekdays.length ? openWeekdays : [2, 3, 4, 5, 6];
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const salonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: SALON.name,
    url: getSiteUrl(),
    address: {
      "@type": "PostalAddress",
      streetAddress: SALON.addressLines[0],
      addressLocality: SALON.addressLines[1],
      addressCountry: "IE",
    },
    geo: { "@type": "GeoCoordinates", latitude: SALON.lat, longitude: SALON.lon },
    openingHoursSpecification: openDays.map((d) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: FULL_WEEK[d] ?? WEEKDAY_LABELS[d],
      opens: hh(SALON_OPEN_HOUR),
      closes: hh(SALON_CLOSE_HOUR),
    })),
  };

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
      <JsonLd data={salonLd} />
      <HomeNav />
      <Hero overall={overall} openToday={openTodayLabel(openDays)} />
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

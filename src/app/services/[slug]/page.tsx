import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { StickyBar } from "@/components/ui/StickyBar";
import { RatingBadge } from "@/components/ui/primitives";
import { StaffCard } from "@/components/ui/StaffCard";
import { Stack } from "@/components/ui/Section";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { blurFor } from "@/lib/assets";
import { formatDuration, formatPrice } from "@/lib/format";
import { getCatalog, getServiceBySlug, getStaffForService } from "@/lib/queries";
import { getRatingsMap } from "@/lib/reviews";

export const revalidate = 600;

// Pre-render every service page at build time.
export async function generateStaticParams() {
  const { services } = await getCatalog();
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return { title: "Service not found — justhairs" };
  return {
    title: `${service.name} — ${formatPrice(service.price_cents)} — justhairs`,
    description: service.description ?? undefined,
    openGraph: service.photo_url ? { images: [service.photo_url] } : undefined,
  };
}

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();
  const [staff, serviceRatings] = await Promise.all([
    getStaffForService(service.id),
    getRatingsMap("service_ratings"),
  ]);
  const rating = serviceRatings[service.id];

  // Price lives in the sticky bar; the meta line carries the rest.
  const meta = [
    formatDuration(service.duration_min),
    service.deposit_cents ? `${formatPrice(service.deposit_cents)} deposit` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AppShell>
      <TopBar title={service.name} />
      <div className="flex-1">
        {service.photo_url && (
          <SmoothImage
            src={service.photo_url}
            alt=""
            width={960}
            height={540}
            preload
            fetchPriority="high"
            blurDataURL={blurFor(service.photo_url)}
            sizes="(max-width: 480px) 100vw, 480px"
            wrapperClassName="block w-full"
            className="aspect-video w-full object-cover"
          />
        )}
        <div className="space-y-4 p-gutter">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-title text-text-primary">{service.name}</h1>
            {rating && rating.review_count > 0 && (
              <RatingBadge rating={rating.rating} count={rating.review_count} />
            )}
          </div>
          <p className="text-label text-text-secondary">{meta}</p>
          {service.description && (
            <p className="text-body text-text-primary">{service.description}</p>
          )}
          {staff.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-subhead text-text-primary">Book with a stylist</h2>
              <Stack gap="sm">
                {staff.map((s) => (
                  <StaffCard
                    key={s.id}
                    name={s.name}
                    subtitle={s.title}
                    photoUrl={s.photo_url}
                    href={`/book?service=${service.slug}&staff=${s.id}&step=date`}
                  />
                ))}
              </Stack>
            </div>
          )}
        </div>
      </div>

      <StickyBar label="Price" value={formatPrice(service.price_cents)}>
        <Button href={`/book?service=${service.slug}`} className="shrink-0">
          Book
        </Button>
      </StickyBar>
    </AppShell>
  );
}

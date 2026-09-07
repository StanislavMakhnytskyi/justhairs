import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { StickyBar } from "@/components/ui/StickyBar";
import { RatingBadge } from "@/components/ui/primitives";
import { ChipLink } from "@/components/ui/Chip";
import { formatDuration, formatPrice } from "@/lib/format";
import { getServiceBySlug, getStaffForService } from "@/lib/queries";
import { getRatingsMap } from "@/lib/reviews";

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

  const meta = [
    formatDuration(service.duration_min),
    formatPrice(service.price_cents),
    service.deposit_cents ? `${formatPrice(service.deposit_cents)} deposit` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <AppShell>
      <TopBar title={service.name} />
      <div className="flex-1">
        {service.photo_url && (
          <Image
            src={service.photo_url}
            alt=""
            width={960}
            height={540}
            className="aspect-video w-full object-cover"
            priority
          />
        )}
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[24px] font-bold tracking-tight text-text-primary">
              {service.name}
            </h1>
            {rating && rating.review_count > 0 && (
              <RatingBadge rating={rating.rating} count={rating.review_count} />
            )}
          </div>
          <p className="text-[14px] text-text-secondary">{meta}</p>
          {service.description && (
            <p className="text-[15px] leading-relaxed text-text-primary">
              {service.description}
            </p>
          )}
          {staff.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[16px] font-bold text-text-primary">Available with</h2>
              <div className="flex flex-wrap gap-1.5">
                {staff.map((s) => (
                  <ChipLink
                    key={s.id}
                    href={`/book?service=${service.slug}&staff=${s.id}&step=date`}
                  >
                    {s.name}
                  </ChipLink>
                ))}
              </div>
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

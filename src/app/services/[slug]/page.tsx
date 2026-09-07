import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { StickyBar } from "@/components/ui/StickyBar";
import { RatingBadge } from "@/components/ui/primitives";
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
        <div className="p-6">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-[24px] font-bold tracking-tight text-text-primary">
              {service.name}
            </h1>
            {rating && rating.review_count > 0 && (
              <RatingBadge rating={rating.rating} count={rating.review_count} />
            )}
          </div>
          <p className="mt-1 text-[14px] text-text-secondary">
            {formatDuration(service.duration_min)} · {formatPrice(service.price_cents)}
            {service.deposit_cents
              ? ` · ${formatPrice(service.deposit_cents)} deposit`
              : ""}
          </p>
          {service.description && (
            <p className="mt-4 text-[15px] leading-relaxed text-text-primary">
              {service.description}
            </p>
          )}

          {staff.length > 0 && (
            <>
              <h2 className="mt-8 text-[16px] font-bold text-text-primary">
                Available with
              </h2>
              <ul className="mt-2 text-[14px] text-text-secondary">
                {staff.map((s) => (
                  <li key={s.id}>
                    {s.name}
                    {s.title ? ` — ${s.title}` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      <StickyBar>
        <span className="flex-1 text-[13px] text-text-secondary">
          {formatPrice(service.price_cents)}
        </span>
        <Button href={`/book?service=${service.slug}`}>Book</Button>
      </StickyBar>
    </AppShell>
  );
}

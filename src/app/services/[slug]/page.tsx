import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Button } from "@/components/ui/Button";
import { StickyBar } from "@/components/ui/StickyBar";
import { formatDuration, formatPrice } from "@/lib/format";
import { getServiceBySlug, getStaffForService } from "@/lib/queries";

export default async function ServiceDetailPage({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();
  const staff = await getStaffForService(service.id);

  return (
    <AppShell>
      <TopBar title={service.name} />
      <div className="flex-1">
        <div className="p-6">
          <h1 className="text-[24px] font-bold tracking-tight text-text-primary">
            {service.name}
          </h1>
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

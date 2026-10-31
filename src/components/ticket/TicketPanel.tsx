import { SmoothImage } from "@/components/ui/SmoothImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { SummaryRow } from "@/components/ui/SummaryList";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";

const EMPTY = <span className="font-normal text-text-tertiary">—</span>;

/**
 * Desktop-only companion to the booking steps: the appointment ticket filling
 * in as choices are made. Purely presentational — BookingFlow owns the state.
 */
export function TicketPanel({
  serviceName,
  categoryName,
  photoUrl,
  priceCents,
  durationMin,
  staffName,
  time,
  step,
}: {
  serviceName: string | null;
  categoryName?: string;
  photoUrl?: string | null;
  priceCents: number | null;
  durationMin: number | null;
  staffName: string | null;
  time: string | null;
  step: number;
}) {
  return (
    <aside
      aria-label="Your ticket"
      className="flex flex-col bg-surface-card text-text-primary"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-surface-sunken">
        {photoUrl ? (
          <SmoothImage
            src={photoUrl}
            alt=""
            fill
            sizes="384px"
            className="object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center text-label font-bold uppercase tracking-[0.16em] text-text-tertiary">
            Your ticket
          </div>
        )}
        <span className="absolute left-4 top-4 rounded-pill bg-[var(--neutral-900)]/70 px-3 py-1 text-caption font-bold text-white backdrop-blur-md">
          Step {step + 1} of 4
        </span>
      </div>

      <div className="flex flex-col gap-5 px-6 py-6">
        <h2 className="text-heading">{serviceName ?? "Pick a service to begin"}</h2>
        <SummaryRow
          label="Service"
          value={serviceName ? `${serviceName}${categoryName ? ` · ${categoryName}` : ""}` : EMPTY}
        />
        <SummaryRow label="Specialist" value={staffName ?? EMPTY} />
        <SummaryRow label="When" value={time ? formatDateTime(time) : EMPTY} />
        <SummaryRow label="Duration" value={durationMin ? formatDuration(durationMin) : EMPTY} />
      </div>

      <div className="cut" aria-hidden />
      <div className="px-6 py-5">
        <SummaryRow label="Total" value={priceCents !== null ? formatPrice(priceCents) : EMPTY} strong />
      </div>
    </aside>
  );
}

/** Same footprint as the filled-in TicketPanel (image, four lines, perforation,
 *  total), so the loading state and the real panel swap without moving anything. */
export function TicketPanelSkeleton() {
  return (
    <aside aria-hidden className="flex flex-col bg-surface-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="flex flex-col gap-5 px-6 py-6">
        <Skeleton className="h-[23px] w-2/3" />
        <Skeleton className="h-[23px]" />
        <Skeleton className="h-[23px]" />
        <Skeleton className="h-[23px]" />
        <Skeleton className="h-[23px]" />
      </div>
      <div className="cut" aria-hidden />
      <div className="px-6 py-5">
        <Skeleton className="h-[23px]" />
      </div>
    </aside>
  );
}

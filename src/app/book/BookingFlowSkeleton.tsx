import { BookShell } from "@/components/ticket/BookShell";
import { TicketPanelSkeleton } from "@/components/ticket/TicketPanel";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * The booking flow's loading state, built to the same measurements as the real
 * thing (shell and side panel, top bar, step row, 93px list rows) so that when
 * the real flow replaces it — as the route's loading UI or the Suspense
 * fallback — nothing moves, resizes or re-animates.
 */
export function BookingFlowSkeleton() {
  return (
    <BookShell aside={<TicketPanelSkeleton />}>
      <div className="flex h-14 items-center gap-2 border-b border-border-default px-gutter">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex px-gutter pb-2 pt-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="mt-1.5 h-[17px] w-12" />
          </div>
        ))}
      </div>
      <div className="flex flex-col px-gutter pb-6 pt-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="-mx-2 flex h-[93px] w-[calc(100%+1rem)] items-center gap-3 border-b-4 border-dotted border-border-default px-2 last:border-b-transparent"
          >
            <Skeleton className="size-14 shrink-0 rounded-[var(--radius-sm)]" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-[18px] w-2/3" />
              <Skeleton className="h-[14px] w-full" />
              <Skeleton className="h-[14px] w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </BookShell>
  );
}

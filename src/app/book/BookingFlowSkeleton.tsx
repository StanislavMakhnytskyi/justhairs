import { BookShell } from "@/components/ticket/BookShell";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

/**
 * Mirrors the booking flow's chrome (top bar, step stubs, list) so the route's
 * loading state and its Suspense fallback don't flash blank or jump.
 */
export function BookingFlowSkeleton() {
  return (
    <BookShell>
      <div className="flex h-14 items-center gap-2 border-b border-border-default px-gutter">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex px-gutter pb-2 pt-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-2">
            <Skeleton className="size-7 rounded-full" />
            <Skeleton className="h-3 w-12" />
          </div>
        ))}
      </div>
      <div className="px-gutter pb-6 pt-3">
        <SkeletonList rows={5} />
      </div>
    </BookShell>
  );
}

import { AppShell } from "@/components/layout/AppShell";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

/**
 * Mirrors the booking flow's chrome (top bar, step tabs, list) so the route's
 * loading state and its Suspense fallback don't flash blank or jump.
 */
export function BookingFlowSkeleton() {
  return (
    <AppShell>
      <div className="flex h-14 items-center gap-2 border-b border-border-default px-4">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex gap-2 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex-1 space-y-2">
            <Skeleton className="h-1 rounded-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <SkeletonList rows={5} />
      </div>
    </AppShell>
  );
}

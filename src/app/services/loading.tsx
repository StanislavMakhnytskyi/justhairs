import { BookShell } from "@/components/ticket/BookShell";
import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <BookShell>
      <div className="flex h-14 items-center gap-2 border-b border-border-default px-gutter">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="p-gutter">
        <Skeleton className="h-10" />
        <div className="mt-4">
          <SkeletonList rows={6} />
        </div>
      </div>
    </BookShell>
  );
}

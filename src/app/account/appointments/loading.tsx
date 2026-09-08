import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="flex h-14 items-center gap-2 border-b border-border-default px-gutter">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="space-y-4 p-gutter">
        <Skeleton className="h-10" />
        <SkeletonList rows={4} />
      </div>
    </div>
  );
}

import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[480px]">
      <Skeleton className="h-56 rounded-none" />
      <div className="space-y-6 p-gutter">
        <Skeleton className="h-6 w-32" />
        <SkeletonList rows={3} />
        <Skeleton className="h-6 w-32" />
        <SkeletonList rows={3} />
      </div>
    </div>
  );
}

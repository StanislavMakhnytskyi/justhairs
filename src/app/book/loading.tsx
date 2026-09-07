import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[480px] p-4">
      <Skeleton className="h-14" />
      <Skeleton className="mt-4 h-8" />
      <div className="mt-6">
        <SkeletonList rows={5} />
      </div>
    </div>
  );
}

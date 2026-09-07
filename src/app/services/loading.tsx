import { Skeleton, SkeletonList } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[480px] p-4">
      <Skeleton className="h-10" />
      <div className="mt-4">
        <SkeletonList rows={6} />
      </div>
    </div>
  );
}

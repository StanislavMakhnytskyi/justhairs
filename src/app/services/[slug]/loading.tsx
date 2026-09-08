import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-[480px]">
      <Skeleton className="aspect-video rounded-none" />
      <div className="space-y-3 p-gutter">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-20" />
      </div>
    </div>
  );
}

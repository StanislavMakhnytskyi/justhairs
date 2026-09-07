import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-14" />
      <Skeleton className="h-32" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-11" />
    </div>
  );
}

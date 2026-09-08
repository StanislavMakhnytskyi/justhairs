import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="space-y-6 p-gutter">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
  );
}

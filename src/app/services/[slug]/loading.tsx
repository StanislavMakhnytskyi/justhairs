import { BookShell } from "@/components/ticket/BookShell";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <BookShell>
      <div className="flex h-14 items-center gap-2 border-b border-border-default px-gutter">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="aspect-video rounded-none" />
      <div className="space-y-3 p-gutter">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-20" />
      </div>
    </BookShell>
  );
}

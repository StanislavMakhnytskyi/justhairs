import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  segmentedTrack,
  segmentedItem,
  segmentedItemActive,
  segmentedItemIdle,
} from "./segmented";

/** Segmented control whose options are links (server-navigable tabs). */
export function SegmentedLinks<T extends string>({
  items,
  active,
  className,
}: {
  items: { value: T; label: string; href: string }[];
  active: T;
  className?: string;
}) {
  return (
    <div className={cn(segmentedTrack, className)}>
      {items.map((it) => (
        <Link
          key={it.value}
          href={it.href}
          aria-current={active === it.value ? "page" : undefined}
          className={cn(
            segmentedItem,
            active === it.value ? segmentedItemActive : segmentedItemIdle,
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

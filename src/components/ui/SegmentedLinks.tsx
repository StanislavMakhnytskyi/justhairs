import Link from "next/link";
import { cn } from "@/lib/cn";

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
    <div
      className={cn(
        "flex gap-1 rounded-[var(--radius-sm)] bg-surface-sunken p-1",
        className,
      )}
    >
      {items.map((it) => (
        <Link
          key={it.value}
          href={it.href}
          aria-current={active === it.value ? "page" : undefined}
          className={cn(
            "flex-1 rounded-[6px] px-3 py-2 text-center text-[13px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
            active === it.value
              ? "bg-surface-card text-text-primary shadow-[var(--shadow-card)]"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

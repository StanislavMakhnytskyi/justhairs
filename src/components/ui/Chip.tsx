import Link from "next/link";
import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center rounded-[var(--radius-pill)] bg-surface-sunken px-2.5 py-1 text-[12px] font-medium text-text-secondary";

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn(base, className)}>{children}</span>;
}

export function ChipLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        base,
        "transition-colors hover:bg-brand-subtle hover:text-brand focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function ChipRow({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <Chip key={it}>{it}</Chip>
      ))}
    </div>
  );
}

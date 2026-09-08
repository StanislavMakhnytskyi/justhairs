import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center rounded-[var(--radius-pill)] bg-surface-sunken px-2.5 py-1 text-caption font-medium text-text-secondary";

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn(base, className)}>{children}</span>;
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

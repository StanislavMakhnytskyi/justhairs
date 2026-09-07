import { cn } from "@/lib/cn";

export function Chip({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] bg-surface-sunken px-2.5 py-1 text-[12px] font-medium text-text-secondary",
        className,
      )}
    >
      {children}
    </span>
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

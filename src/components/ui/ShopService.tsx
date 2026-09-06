import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/format";

export function ShopService({
  name,
  priceCents,
  durationMin,
  description,
  selected,
  action,
  onClick,
}: {
  name: string;
  priceCents: number;
  durationMin: number;
  description?: string | null;
  selected?: boolean;
  action?: string;
  onClick?: () => void;
}) {
  const Wrapper = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors",
        selected ? "border-brand bg-brand-subtle" : "border-border-default bg-surface-card",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-text-primary">{name}</p>
        {description && (
          <p className="mt-0.5 line-clamp-1 text-[13px] text-text-secondary">
            {description}
          </p>
        )}
        <p className="mt-1 text-[13px] text-text-secondary">
          {formatDuration(durationMin)} · {formatPrice(priceCents)}
        </p>
      </div>
      {action && (
        <span
          className={cn(
            "shrink-0 rounded-[var(--radius-pill)] px-3 py-1.5 text-[12px] font-bold",
            selected ? "bg-brand text-text-on-brand" : "bg-surface-sunken text-text-primary",
          )}
        >
          {action}
        </span>
      )}
    </Wrapper>
  );
}

import Image from "next/image";
import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/format";

export function ShopService({
  name,
  priceCents,
  durationMin,
  description,
  photoUrl,
  selected,
  action,
  onClick,
}: {
  name: string;
  priceCents: number;
  durationMin: number;
  description?: string | null;
  photoUrl?: string | null;
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
        onClick &&
          "focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
        selected ? "border-brand bg-brand-subtle" : "border-border-default bg-surface-card",
      )}
    >
      {photoUrl && (
        <Image
          src={photoUrl}
          alt=""
          width={56}
          height={56}
          className="h-14 w-14 shrink-0 rounded-[var(--radius-sm)] object-cover"
        />
      )}
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

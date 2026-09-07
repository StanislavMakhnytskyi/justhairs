import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { formatDuration, formatPrice } from "@/lib/format";

const shell =
  "flex w-full items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-colors";
const interactive =
  "hover:border-brand-hover focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2";

export function ShopService({
  name,
  priceCents,
  durationMin,
  description,
  photoUrl,
  selected,
  action,
  href,
  onClick,
}: {
  name: string;
  priceCents: number;
  durationMin: number;
  description?: string | null;
  photoUrl?: string | null;
  selected?: boolean;
  action?: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    shell,
    (href || onClick) && interactive,
    selected ? "border-brand bg-brand-subtle" : "border-border-default bg-surface-card",
  );

  const body = (
    <>
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
            selected
              ? "bg-brand text-text-on-brand"
              : "bg-surface-sunken text-text-primary",
          )}
        >
          {action}
        </span>
      )}
    </>
  );

  if (href) return <Link href={href} className={cls}>{body}</Link>;
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

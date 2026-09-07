import Link from "next/link";
import { cn } from "@/lib/cn";
import { Avatar, RatingBadge } from "./primitives";
import { LinkPendingBar } from "./LinkPendingBar";
import type { Rating } from "@/lib/supabase/types";

const shell =
  "relative flex w-full items-center gap-3 overflow-hidden rounded-[var(--radius-md)] border p-3 text-left transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out)]";
const interactive =
  "hover:border-brand-hover motion-safe:active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2";

export function StaffCard({
  name,
  subtitle,
  photoUrl,
  rating,
  selected,
  href,
  onClick,
}: {
  name: string;
  subtitle?: string | null;
  photoUrl?: string | null;
  rating?: Rating;
  selected?: boolean;
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
      <Avatar name={name} src={photoUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-text-primary">{name}</p>
        {subtitle && (
          <p className="truncate text-[13px] text-text-secondary">{subtitle}</p>
        )}
      </div>
      {rating && rating.review_count > 0 && (
        <RatingBadge rating={rating.rating} count={rating.review_count} />
      )}
    </>
  );

  if (href)
    return (
      <Link href={href} className={cls}>
        {body}
        <LinkPendingBar />
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  return <div className={cls}>{body}</div>;
}

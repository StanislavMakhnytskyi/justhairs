import { cn } from "@/lib/cn";
import { Avatar, RatingBadge } from "./primitives";
import type { Rating } from "@/lib/supabase/types";

export function StaffCard({
  name,
  subtitle,
  rating,
  selected,
  onClick,
}: {
  name: string;
  subtitle?: string | null;
  rating?: Rating;
  selected?: boolean;
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
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-text-primary">{name}</p>
        {subtitle && (
          <p className="truncate text-[13px] text-text-secondary">{subtitle}</p>
        )}
      </div>
      {rating && rating.review_count > 0 && (
        <RatingBadge rating={rating.rating} count={rating.review_count} />
      )}
    </Wrapper>
  );
}

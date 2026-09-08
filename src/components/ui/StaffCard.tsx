import { Avatar, RatingBadge } from "./primitives";
import { RowShell } from "./RowShell";
import type { Rating } from "@/lib/supabase/types";

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
  const showRating = rating && rating.review_count > 0;
  return (
    <RowShell
      selected={selected}
      href={href}
      onClick={onClick}
      end={
        showRating ? (
          <RatingBadge rating={rating!.rating} count={rating!.review_count} />
        ) : undefined
      }
    >
      <Avatar name={name} src={photoUrl} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-subhead text-text-primary">{name}</p>
        {subtitle && (
          <p className="truncate text-label text-text-secondary">{subtitle}</p>
        )}
      </div>
    </RowShell>
  );
}

import { Star } from "lucide-react";

/** A rating as a star icon and a figure, e.g. "★ 4.9 (12)" without the glyph. */
export function StarScore({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-label font-bold">
      <Star size={14} className="fill-current text-rating" aria-hidden />
      {rating.toFixed(1)}
      {count !== undefined && <span className="font-normal opacity-70">({count})</span>}
    </span>
  );
}

import { StarRating } from "./StarRating";

export function ReviewCard({
  rating,
  comment,
  reviewer,
  context,
}: {
  rating: number;
  comment?: string | null;
  reviewer: string;
  context?: string | null;
}) {
  return (
    <figure className="rounded-[var(--radius-md)] bg-surface-sunken p-4">
      <StarRating value={rating} size={16} />
      {comment && (
        <blockquote className="mt-2 text-body text-text-primary">
          &ldquo;{comment}&rdquo;
        </blockquote>
      )}
      <figcaption className="mt-2 text-label text-text-secondary">
        — {reviewer}
        {context ? ` · ${context}` : ""}
      </figcaption>
    </figure>
  );
}

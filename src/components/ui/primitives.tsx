import { cn } from "@/lib/cn";
import { SmoothImage } from "./SmoothImage";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] bg-surface-card p-4 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  );
}

export function Divider({ className }: { className?: string }) {
  return <hr className={cn("border-0 border-t border-border-default", className)} />;
}

/** The heading row shared by page sections — a title and a trailing action. */
export function SectionHeader({
  title,
  action,
}: {
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      {title && <h2 className="text-heading text-text-primary">{title}</h2>}
      {action}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "success" | "warning" | "error" | "brand";
  children: React.ReactNode;
}) {
  const tones = {
    neutral: "bg-surface-sunken text-text-secondary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-error/10 text-error",
    brand: "bg-brand-subtle text-link",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-1 text-caption font-bold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

export function RatingBadge({
  rating,
  count,
}: {
  rating: number;
  count?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-label font-bold text-text-secondary">
      <span className="text-rating">★</span>
      {rating.toFixed(1)}
      {count !== undefined && (
        <span className="font-normal text-text-tertiary">({count})</span>
      )}
    </span>
  );
}

/** Decorative: every caller prints the name beside it, so the photo is
 *  alt="" and the initials are aria-hidden (no name read twice). */
export function Avatar({
  name,
  src,
  size = 44,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  if (src) {
    return (
      <SmoothImage
        src={src}
        alt=""
        width={size}
        height={size}
        sizes={`${size}px`}
        wrapperClassName="shrink-0 rounded-full"
        wrapperStyle={{ width: size, height: size }}
        className="h-full w-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-600"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials}
    </span>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] bg-surface-sunken px-gutter py-12 text-center">
      <p className="text-subhead text-text-primary">{title}</p>
      {description && (
        <p className="text-label text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}

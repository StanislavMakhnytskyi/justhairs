import { cn } from "@/lib/cn";

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

export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-[19px] font-bold tracking-tight text-text-primary">{title}</h2>
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
    brand: "bg-brand-subtle text-brand",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-1 text-[12px] font-bold",
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
    <span className="inline-flex items-center gap-1 text-[13px] font-bold text-text-secondary">
      <span className="text-rating">★</span>
      {rating.toFixed(1)}
      {count !== undefined && (
        <span className="font-normal text-text-tertiary">({count})</span>
      )}
    </span>
  );
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
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
    <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] bg-surface-sunken px-6 py-12 text-center">
      <p className="text-[15px] font-bold text-text-primary">{title}</p>
      {description && (
        <p className="text-[13px] text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}

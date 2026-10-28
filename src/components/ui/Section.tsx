import { cn } from "@/lib/cn";
import { SectionHeader } from "./primitives";

/** A page section: consistent gutters + an optional header with a trailing action. */
export function Section({
  id,
  title,
  action,
  compact,
  className,
  children,
}: {
  /** Anchor target for in-page nav links. */
  id?: string;
  title?: string;
  action?: React.ReactNode;
  /** Tighter vertical padding — for short one-line sections. */
  compact?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("px-gutter", compact ? "py-4" : "py-6", id && "scroll-mt-20", className)}
    >
      {(title || action) && <SectionHeader title={title} action={action} />}
      {children}
    </section>
  );
}

/** Vertical stack with the standard card gap. */
export function Stack({
  gap = "md",
  className,
  children,
}: {
  gap?: "sm" | "md";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", gap === "sm" ? "gap-2" : "gap-3", className)}>
      {children}
    </div>
  );
}

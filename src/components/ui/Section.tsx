import { cn } from "@/lib/cn";

/** A page section: consistent gutters + an optional header with a trailing action. */
export function Section({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("px-6 py-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className="text-[19px] font-bold tracking-tight text-text-primary">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
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

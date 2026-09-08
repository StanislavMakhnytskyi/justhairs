import { cn } from "@/lib/cn";

/** Muted, centered helper message — for empty/loading states inside a flow. */
export function Hint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-[var(--radius-md)] bg-surface-sunken px-4 py-6 text-center text-label text-text-secondary",
        className,
      )}
    >
      {children}
    </p>
  );
}

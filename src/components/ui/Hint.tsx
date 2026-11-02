import { cn } from "@/lib/cn";

/** Muted, centered helper message — for empty/loading states inside a flow.
 *  Pass `role="status"` when the text changes in place and should be read out
 *  politely, or `role="alert"` for a failure the user must act on. A live
 *  region is only announced reliably if it is already mounted when its text
 *  changes, so keep a status Hint rendered and swap its children. */
export function Hint({
  children,
  className,
  role,
}: {
  children: React.ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={cn(
        "rounded-[var(--radius-md)] bg-surface-sunken px-4 py-6 text-center text-label text-text-secondary",
        className,
      )}
    >
      {children}
    </div>
  );
}

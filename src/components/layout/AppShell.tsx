import { cn } from "@/lib/cn";

/** Mobile-first frame: centered, capped width, min-height screen. */
export function AppShell({
  children,
  className,
  withNav = false,
}: {
  children: React.ReactNode;
  className?: string;
  withNav?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-app",
        withNav && "pb-20",
        className,
      )}
    >
      {children}
    </div>
  );
}

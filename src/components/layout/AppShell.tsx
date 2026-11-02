import { cn } from "@/lib/cn";

/** Mobile-first frame: centered, capped width, min-height screen. */
export function AppShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className={cn(
        "mx-auto outline-none flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-app",
        className,
      )}
    >
      {children}
    </main>
  );
}

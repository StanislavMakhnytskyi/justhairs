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
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-app",
        className,
      )}
    >
      {children}
    </main>
  );
}

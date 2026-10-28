import { cn } from "@/lib/cn";

/** Home-page frame: the same 480px mobile column as AppShell, opening up to
 *  the full viewport from `lg` so the page can lay out as a wide marketing
 *  page. Every other route keeps AppShell. */
export function HomeShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-surface-app lg:max-w-none",
        className,
      )}
    >
      {children}
    </main>
  );
}

/** Centered content column for the wide layout; a no-op on mobile. */
export function HomeContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("w-full lg:mx-auto lg:max-w-6xl lg:px-10", className)}>{children}</div>
  );
}

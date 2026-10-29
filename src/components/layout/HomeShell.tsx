import { cn } from "@/lib/cn";

/** Home-page frame: full-width, because the page is a stack of colour bands
 *  whose content sets its own measure. Every other route keeps AppShell. */
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
        "mx-auto flex min-h-dvh w-full flex-col bg-surface-app lg:bg-surface-sunken",
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

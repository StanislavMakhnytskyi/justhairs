import Link from "next/link";
import { HomeNav } from "@/components/marketing/HomeNav";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

/**
 * Frame for every booking-side page: the home page's appointment card, one
 * screen at a time. A brand band with a paper card on it; the card "prints in"
 * on arrival. Header, body and stub are the card's children — see TopBar,
 * StickyBar (the stub) and the `.cut` perforation in globals.css.
 *
 * From lg the floating nav pill sits above it, and an optional `aside` (the
 * live ticket) takes the left column beside the card.
 */
export function BookShell({
  children,
  aside,
  className,
}: {
  children: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <main className="book-band min-h-dvh px-3 py-3 sm:px-6 sm:py-8 lg:pb-8 lg:pt-24">
      <HomeNav variant="book" />
      <Link
        href="/"
        aria-label="justhairs home"
        className="mx-auto mb-5 hidden w-fit focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:block lg:hidden"
      >
        <Logo tone="onBrand" />
      </Link>
      <div
        className={cn(
          "mx-auto flex w-full items-start justify-center",
          aside ? "lg:max-w-[62rem] lg:gap-8" : "max-w-[34rem] lg:max-w-[40rem]",
        )}
      >
        {aside && (
          <div className="sticky top-24 hidden w-[24rem] shrink-0 lg:block">{aside}</div>
        )}
        <div
          className={cn(
            "flex min-h-[calc(100dvh-1.5rem)] w-full max-w-[34rem] flex-col bg-surface-card text-text-primary motion-safe:animate-print sm:min-h-[calc(100dvh-10rem)] lg:min-h-[calc(100dvh-8rem)]",
            aside && "lg:max-w-none lg:flex-1",
            className,
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

import Link from "next/link";
import { HomeNav } from "@/components/marketing/HomeNav";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

/**
 * The booking frame's one width source. Every booking page uses the same
 * desktop geometry, ticket or not: a 24rem left column + 2rem gap + a card of
 * at most 36rem = the 62rem wrapper. Pages without a ticket (pay,
 * confirmation, services, errors) render no column: the card is centred in the
 * wrapper at the same 36rem, so its width is identical on every booking
 * screen. Below lg the card is one centred
 * 34rem sheet. `min-w-0` matters: the card is a flex item, and without it a
 * wide child (DateStrip's scroller) stretches the card to its content width.
 */
const FRAME = {
  wrapper: "max-w-[34rem] lg:max-w-[62rem] lg:gap-8",
  column: "hidden w-[24rem] shrink-0 lg:block",
  card: "w-full min-w-0 lg:flex-1",
  /** Beside the ticket: the card takes what the column + gap leave, ≤ 36rem. */
  cardBeside: "lg:max-w-[36rem]",
  /**
   * Alone: centred, and capped at what it would get beside the column (wrapper
   * − 24rem − 2rem), so it matches /book even where the wrapper is squeezed
   * below 62rem (e.g. 1024px).
   */
  cardAlone: "lg:mx-auto lg:max-w-[min(36rem,calc(100%_-_26rem))]",
} as const;

/**
 * Frame for every booking-side page: the home page's appointment card, one
 * screen at a time. A brand band with a paper card on it; the card "prints in"
 * in place — no entrance animation on the card itself: the loading skeleton and
 * the real content both render this shell, and a swap must look like nothing
 * happened. Header, body and stub are the card's children — see TopBar,
 * StickyBar (the stub) and the `.cut` perforation in globals.css.
 *
 * From lg the floating nav pill sits above it, and an optional `aside` (the
 * live ticket) takes the left column beside the card; without one there is no
 * column and the card is centred at the same width (see FRAME).
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
      <div className={cn("mx-auto flex w-full items-start justify-center", FRAME.wrapper)}>
        {aside ? <div className={cn("sticky top-24", FRAME.column)}>{aside}</div> : null}
        {/* The skip link's target (layout.tsx): the card itself, past the nav. */}
        <div
          id="main"
          tabIndex={-1}
          className={cn(
            "flex min-h-[calc(100dvh-1.5rem)] flex-col bg-surface-card text-text-primary outline-none sm:min-h-[calc(100dvh-10rem)] lg:min-h-[calc(100dvh-8rem)]",
            FRAME.card,
            aside ? FRAME.cardBeside : FRAME.cardAlone,
            className,
          )}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

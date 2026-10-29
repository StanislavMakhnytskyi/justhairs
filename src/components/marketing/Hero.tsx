import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { HERO_IMAGE, HERO_VIDEO, blurFor } from "@/lib/assets";
import { SALON } from "@/lib/salon";
import { HeroVideo } from "./HeroVideo";

const rise = "motion-safe:animate-rise stagger";
const step = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** The first screen is the salon footage, full strength, with the appointment
 *  card laid on its lower edge: main part on the left, tear-off stub with the
 *  address on the right. The card is compact so the video stays the stage. */
export function Hero({
  overall,
  openToday,
}: {
  overall: { rating: number; review_count: number } | null;
  /** e.g. "Open today 9:00–18:00" / "Closed today" — computed by the page. */
  openToday: string;
}) {
  return (
    <section className="relative isolate flex min-h-[88svh] items-end overflow-hidden px-gutter pb-8 pt-24 lg:m-4 lg:min-h-[calc(100svh-2rem)] lg:rounded-tile lg:px-10 lg:pb-12">
      <SmoothImage
        src={HERO_IMAGE}
        alt=""
        fill
        preload
        fetchPriority="high"
        blurDataURL={blurFor(HERO_IMAGE)}
        sizes="(min-width: 1024px) 100vw, (max-width: 480px) 100vw, 480px"
        className="-z-10 object-cover"
      />
      {HERO_VIDEO && <HeroVideo mp4={HERO_VIDEO.mp4} webm={HERO_VIDEO.webm} />}
      {/* Light over the footage; the dark pools only where the card sits. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--neutral-900)]/70 via-[var(--neutral-900)]/10 to-transparent lg:bg-gradient-to-tr lg:from-[var(--neutral-900)]/65 lg:via-transparent" />

      <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-6">
        <div
          className="ticket-hero w-full max-w-[22rem] bg-surface-card text-text-primary motion-safe:animate-print lg:grid lg:max-w-[44rem] lg:grid-cols-[1fr_13rem]"
          style={step(1)}
        >
          <div className="px-6 pb-7 pt-8 lg:px-10 lg:py-10">
            <h1 className={`text-display ${rise}`} style={step(3)}>
              Book your look in under a minute
            </h1>
            <p className={`mt-3 max-w-[36ch] text-body text-text-secondary ${rise}`} style={step(4)}>
              Haircuts, colour and styling for men and women.
            </p>
            <Button
              href="/book"
              className={`mt-6 w-full lg:w-auto ${rise}`}
              style={step(5)}
            >
              Book appointment
            </Button>
          </div>

          <div
            className={`perforation hidden flex-col justify-center gap-1 px-6 text-label text-text-secondary lg:flex lg:px-7 ${rise}`}
            style={step(6)}
          >
            <p className="text-subhead text-text-primary">{SALON.addressLines[0]}</p>
            <p>{SALON.addressLines[1]}</p>
            <p className="mt-2">Tue–Sat · 9:00–18:00</p>
            <p>Closed Sunday &amp; Monday</p>
          </div>
        </div>

        {/* Glass chips: the two facts a visitor wants before anything else. */}
        <div className={`hidden shrink-0 flex-col items-end gap-2 lg:mr-12 lg:flex ${rise}`} style={step(7)}>
          {overall && (
            <p className="rounded-pill border border-white/25 bg-[var(--neutral-900)]/35 px-4 py-2 text-label font-bold text-white backdrop-blur-xl">
              <span className="text-rating">★</span> {overall.rating.toFixed(1)}
              <span className="font-normal opacity-80"> · {overall.review_count} reviews</span>
            </p>
          )}
          <p className="rounded-pill border border-white/25 bg-[var(--neutral-900)]/35 px-4 py-2 text-label font-bold text-white backdrop-blur-xl">
            {openToday}
          </p>
        </div>
      </div>
    </section>
  );
}

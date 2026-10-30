import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { HERO_POSTER, HERO_VIDEO, blurFor } from "@/lib/assets";
import { SALON } from "@/lib/salon";
import { HeroVideo } from "./HeroVideo";

const rise = "motion-safe:animate-rise stagger";
const step = (i: number) => ({ "--i": i }) as React.CSSProperties;

const chip =
  "rounded-pill border border-white/25 bg-[var(--neutral-900)]/40 px-3.5 py-1.5 text-label font-bold text-white backdrop-blur-xl";

/** The first screen is an appointment card.
 *
 *  Phone: one tall card on the brand band. The footage fills all of it; the
 *  headline, sentence and action sit on the footage (over a neutral scrim), so
 *  title and video are one picture rather than two stacked blocks. The only
 *  paper is the tear-off stub at the foot — address and hours — whose scalloped
 *  top edge bites into the footage, the same edge as the services sheet.
 *
 *  Desktop (lg): the footage fills an inset rounded panel and a compact paper
 *  ticket sits on its lower edge — main part left, stub with the address. */
export function Hero({
  overall,
  openToday,
}: {
  overall: { rating: number; review_count: number } | null;
  /** e.g. "Open today 9:00–18:00" / "Closed today" — computed by the page. */
  openToday: string;
}) {
  return (
    <section className="relative isolate bg-brand px-3 pb-6 pt-3 lg:m-4 lg:flex lg:min-h-[calc(100svh-2rem)] lg:items-end lg:overflow-hidden lg:rounded-tile lg:px-10 lg:pb-12 lg:pt-24">
      <div className="relative isolate flex min-h-[min(46rem,calc(100svh-3rem))] flex-col overflow-hidden rounded-[1.25rem] bg-[var(--neutral-900)] max-lg:motion-safe:animate-print lg:contents">
        {/* Footage: fills the phone card, and the whole backdrop on desktop. */}
        <div className="absolute inset-0 isolate overflow-hidden bg-[var(--neutral-900)]">
          <SmoothImage
            src={HERO_POSTER}
            alt=""
            fill
            preload
            fetchPriority="high"
            blurDataURL={blurFor(HERO_POSTER)}
            sizes="(min-width: 1024px) 100vw, (max-width: 480px) 100vw, 480px"
            className="-z-10 object-cover"
          />
          {HERO_VIDEO && <HeroVideo mp4={HERO_VIDEO.mp4} webm={HERO_VIDEO.webm} />}
          {/* Neutral scrim. Phone: deepens toward the foot so the white headline
              holds; the top of the footage stays clear. Desktop: the dark pools
              only where the ticket sits. */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--neutral-900)]/92 via-[var(--neutral-900)]/60 via-50% to-transparent lg:bg-gradient-to-tr lg:from-[var(--neutral-900)]/65 lg:via-transparent" />

          {/* Phone: the rating, top-left, opposite the pause button. */}
          {overall && (
            <p className={`absolute left-3 top-3 lg:hidden ${chip} ${rise}`} style={step(2)}>
              <span className="text-rating">★</span> {overall.rating.toFixed(1)}
              <span className="font-normal opacity-80"> · {overall.review_count} reviews</span>
            </p>
          )}
        </div>

        <div className="relative mx-auto mt-auto flex w-full max-w-6xl items-end justify-between gap-6 lg:z-0 lg:mt-0">
          <div
            className="ticket-hero w-full text-white lg:grid lg:max-w-[44rem] lg:grid-cols-[1fr_13rem] lg:bg-surface-card lg:text-text-primary lg:motion-safe:animate-print"
            style={step(1)}
          >
            <div className="px-5 pb-6 pt-24 lg:px-10 lg:py-10">
              <h1 className={`text-display ${rise}`} style={step(3)}>
                Book your look in under a minute
              </h1>
              <p
                className={`mt-3 max-w-[36ch] text-body text-white/92 lg:text-text-secondary ${rise}`}
                style={step(4)}
              >
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

          {/* Desktop glass chips, bottom-right of the footage. */}
          <div className={`hidden shrink-0 flex-col items-end gap-2 lg:mr-12 lg:flex ${rise}`} style={step(7)}>
            {overall && (
              <p className={chip.replace("px-3.5 py-1.5", "px-4 py-2")}>
                <span className="text-rating">★</span> {overall.rating.toFixed(1)}
                <span className="font-normal opacity-80"> · {overall.review_count} reviews</span>
              </p>
            )}
            <p className={chip.replace("px-3.5 py-1.5", "px-4 py-2")}>{openToday}</p>
          </div>
        </div>

        {/* Phone: the tear-off stub. Paper, scalloped along its top edge so the
            footage shows through the bites. */}
        <div
          className="scallop-top relative bg-surface-card px-5 pb-4 pt-6 text-text-primary lg:hidden"
          style={{ "--r": "9px" } as React.CSSProperties}
        >
          <p className="text-subhead">
            {SALON.addressLines[0]}, {SALON.addressLines[1]}
          </p>
          <p className="mt-0.5 text-label text-text-secondary">{openToday}</p>
        </div>
      </div>
    </section>
  );
}

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
 *  Phone: one vertical ticket on the brand band — the salon footage is its
 *  photo panel, a perforation, then the paper with the headline and the action.
 *  Nothing is laid over the video, so neither fights the other.
 *
 *  Desktop (lg): the footage fills an inset rounded panel and a compact ticket
 *  sits on its lower edge — main part left, tear-off stub with the address. */
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
      <div className="overflow-hidden rounded-[1.25rem] bg-surface-card max-lg:motion-safe:animate-print lg:contents">
        {/* Footage: the card's photo panel on a phone, the whole backdrop on desktop. */}
        <div className="relative isolate aspect-[4/5] max-h-[62svh] w-full overflow-hidden bg-[var(--neutral-900)] lg:absolute lg:inset-0 lg:aspect-auto lg:max-h-none">
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
          {/* A touch of shade at the foot of the footage for the chip (phone); on
              desktop the dark pools only where the ticket sits. */}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[var(--neutral-900)]/45 via-transparent to-transparent lg:bg-gradient-to-tr lg:from-[var(--neutral-900)]/65 lg:via-transparent" />

          {/* Phone: the two facts a visitor wants first, riding on the footage. */}
          <div className={`absolute bottom-3 left-3 flex flex-wrap gap-2 lg:hidden ${rise}`} style={step(2)}>
            {overall && (
              <p className={chip}>
                <span className="text-rating">★</span> {overall.rating.toFixed(1)}
                <span className="font-normal opacity-80"> · {overall.review_count} reviews</span>
              </p>
            )}
            <p className={chip}>{openToday}</p>
          </div>
        </div>

        {/* Perforation between photo and paper (phone only). Its notches take the
            band colour, so it reads as bitten out of the card. */}
        <div className="cut lg:hidden" aria-hidden />

        <div className="relative mx-auto flex w-full max-w-6xl items-end justify-between gap-6 lg:z-0">
          <div
            className="ticket-hero w-full bg-surface-card text-text-primary lg:grid lg:max-w-[44rem] lg:grid-cols-[1fr_13rem] lg:motion-safe:animate-print"
            style={step(1)}
          >
            <div className="px-6 pb-6 pt-7 lg:px-10 lg:py-10">
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
              {/* Phone: the stub's address, as a line under the action. */}
              <p className={`mt-5 text-center text-label text-text-secondary lg:hidden ${rise}`} style={step(6)}>
                {SALON.addressLines[0]}, {SALON.addressLines[1]} · Tue–Sat 9–18
              </p>
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
      </div>
    </section>
  );
}

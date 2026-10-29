import { Button } from "@/components/ui/Button";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { HERO_IMAGE, HERO_VIDEO, blurFor } from "@/lib/assets";
import { SALON } from "@/lib/salon";
import { HeroVideo } from "./HeroVideo";

const rise = "motion-safe:animate-rise stagger";
const step = (i: number) => ({ "--i": i }) as React.CSSProperties;

/** The first screen is the appointment card itself: a paper ticket laid on the
 *  salon footage, main part on the left, tear-off stub with the address. */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[34rem] items-center overflow-hidden px-gutter py-12 lg:min-h-[calc(100svh-4rem)] lg:px-10 lg:py-20">
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
      {/* Flat scrim so the card and the footage both read. */}
      <div className="absolute inset-0 -z-10 bg-[var(--neutral-900)]/55" />

      <div className="mx-auto w-full max-w-6xl">
        <div
          className={`ticket mx-auto w-full max-w-[26rem] bg-surface-card text-text-primary lg:grid lg:max-w-[58rem] lg:grid-cols-[1fr_16rem] ${rise}`}
          style={step(0)}
        >
          <div className="px-7 pb-9 pt-10 lg:px-14 lg:py-16">
            <h1 className="text-display lg:text-hero">Book your look in under a minute</h1>
            <p className="mt-4 max-w-[38ch] text-body text-text-secondary">
              Haircuts, colour and styling for men and women. Pick a service, a stylist and a
              time — we handle the rest.
            </p>
            <Button href="/book" className="mt-7 w-full lg:w-auto">
              Book appointment
            </Button>
          </div>

          <div className="perforation flex h-[7.5rem] flex-col justify-center gap-1 px-7 text-label text-text-secondary lg:h-auto lg:px-8">
            <p className="text-subhead text-text-primary">{SALON.addressLines[0]}</p>
            <p>{SALON.addressLines[1]}</p>
            <p className="mt-2">Tue–Sat · 9:00–18:00</p>
            <p>Closed Sunday &amp; Monday</p>
          </div>
        </div>
      </div>
    </section>
  );
}

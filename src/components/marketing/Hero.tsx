import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { HERO_IMAGE, HERO_VIDEO, blurFor } from "@/lib/assets";
import { HeroVideo } from "./HeroVideo";

const rise = "motion-safe:animate-rise stagger";
const step = (i: number) => ({ "--i": i }) as React.CSSProperties;

export function Hero() {
  return (
    <section className="relative isolate min-h-72 overflow-hidden px-gutter pb-8 pt-14 text-white">
      <SmoothImage
        src={HERO_IMAGE}
        alt=""
        fill
        preload
        fetchPriority="high"
        blurDataURL={blurFor(HERO_IMAGE)}
        sizes="(max-width: 480px) 100vw, 480px"
        className="-z-10 object-cover"
      />
      {HERO_VIDEO && <HeroVideo mp4={HERO_VIDEO.mp4} webm={HERO_VIDEO.webm} />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-600/75 to-purple-800/85" />
      <div className={rise} style={step(0)}>
        <Logo tone="onBrand" size="lg" />
      </div>
      <h1 className={`mt-4 text-display ${rise}`} style={step(1)}>
        Book your look in under a minute
      </h1>
      <p className={`mt-2 max-w-[38ch] text-body opacity-90 ${rise}`} style={step(2)}>
        Haircuts, colour and styling for men and women. Pick a service, a stylist and a
        time — we handle the rest.
      </p>
      <div className={`mt-5 ${rise}`} style={step(3)}>
        <Button href="/book" variant="white">
          Book appointment
        </Button>
      </div>
    </section>
  );
}

import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { HERO_IMAGE, blurFor } from "@/lib/assets";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-gutter pb-8 pt-14 text-white">
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
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-600/75 to-purple-800/85" />
      <Logo tone="onBrand" size="lg" />
      <h1 className="mt-4 text-display">Book your look in under a minute</h1>
      <p className="mt-2 max-w-[38ch] text-body opacity-90">
        Haircuts, colour and styling for men and women. Pick a service, a stylist and a
        time — we handle the rest.
      </p>
      <Button href="/book" variant="white" className="mt-5">
        Book appointment
      </Button>
    </section>
  );
}

import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { HERO_BLUR, HERO_IMAGE } from "@/lib/assets";

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden px-6 pb-8 pt-14 text-white">
      <Image
        src={HERO_IMAGE}
        alt=""
        fill
        priority
        placeholder="blur"
        blurDataURL={HERO_BLUR}
        sizes="480px"
        className="-z-10 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-purple-600/75 to-purple-800/85" />
      <p className="text-[13px] font-bold uppercase tracking-[0.14em] opacity-80">
        justhairs
      </p>
      <h1 className="mt-3 text-[32px] font-bold leading-[1.1] tracking-tight">
        Book your look in under a minute
      </h1>
      <p className="mt-2 max-w-[38ch] text-[14px] opacity-90">
        Haircuts, colour and styling for men and women. Pick a service, a stylist and a
        time — we handle the rest.
      </p>
      <Button href="/book" variant="white" className="mt-5">
        Book appointment
      </Button>
    </section>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { cn } from "@/lib/cn";

const SECTIONS = [
  { href: "#services", label: "Services" },
  { href: "#team", label: "Team" },
  { href: "#reviews", label: "Reviews" },
  { href: "#visit", label: "Visit us" },
];
const PAGES = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/#team", label: "Team" },
];

/**
 * Desktop-only floating nav: a frosted pill that hovers over the page. On the
 * home page it condenses into a solid-ish pill once you leave the hero, and
 * highlights the section you are in. `variant="book"` is the same pill with
 * page links, for the booking side.
 */
export function HomeNav({ variant = "home" }: { variant?: "home" | "book" }) {
  const home = variant === "home";
  const [condensed, setCondensed] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    if (!home) return;
    const onScroll = () => setCondensed(window.scrollY > window.innerHeight * 0.55);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [home]);

  // Scroll-spy: the section crossing the middle band of the viewport is active.
  useEffect(() => {
    if (!home) return;
    const els = SECTIONS.map((l) => document.querySelector(l.href)).filter(
      (el): el is Element => !!el,
    );
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(`#${e.target.id}`);
          else setActive((cur) => (cur === `#${e.target.id}` ? null : cur));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [home]);

  const links = home ? SECTIONS : PAGES;
  const solid = home && condensed;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-40 hidden justify-center lg:flex">
      <div
        className={cn(
          "pointer-events-auto flex h-14 items-center gap-6 rounded-pill border pl-5 pr-2 backdrop-blur-xl transition-[width,background-color,border-color,color,box-shadow] duration-300 ease-[var(--ease-out)] motion-safe:animate-pill-in",
          solid
            ? "w-[44rem] border-border-default bg-surface-card/85 text-text-primary shadow-card"
            : "w-[min(72rem,calc(100vw-3rem))] border-white/25 bg-[var(--neutral-900)]/30 text-white",
        )}
      >
        <Link
          href="/"
          aria-label="justhairs home"
          className="mr-auto rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          <Logo tone={solid ? "default" : "onBrand"} />
        </Link>
        <nav aria-label={home ? "Sections" : "Pages"} className="flex gap-1">
          {links.map((l) => {
            const on = home && active === l.href;
            return (
              <a
                key={l.href}
                href={l.href}
                aria-current={on ? "true" : undefined}
                className={cn(
                  "rounded-pill px-3.5 py-2 text-label font-bold transition-colors duration-200 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  solid
                    ? on
                      ? "bg-brand-subtle text-link"
                      : "text-text-secondary hover:text-text-primary"
                    : on
                      ? "bg-white/20 text-white"
                      : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                {l.label}
              </a>
            );
          })}
        </nav>
        <Button href="/book" size="md" className="rounded-pill">
          Book now
        </Button>
      </div>
    </header>
  );
}

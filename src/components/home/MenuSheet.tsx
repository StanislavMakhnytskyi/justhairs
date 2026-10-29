"use client";

import Link from "next/link";
import { useState } from "react";
import { Reveal } from "@/components/ui/Reveal";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { cn } from "@/lib/cn";

export type MenuItem = {
  slug: string;
  name: string;
  price: string;
  duration: string;
  description: string | null;
  photoUrl: string | null;
};

export type MenuGroup = { title: string; items: MenuItem[] };

/**
 * The salon's price list as the printed sheet it replaces. Pointing at a row
 * brings its photograph up in the frame beside the sheet (on touch screens the
 * row carries its own small picture) and dims the other rows.
 */
export function MenuSheet({ groups, hours }: { groups: MenuGroup[]; hours: string[] }) {
  const all = groups.flatMap((g) => g.items);
  const withPhoto = all.filter((i) => i.photoUrl);
  const [hovered, setHovered] = useState<string | null>(null);
  const shownSlug = hovered ?? withPhoto[0]?.slug ?? null;
  const shown = all.find((i) => i.slug === shownSlug) ?? null;

  return (
    <section
      id="services"
      aria-labelledby="menu-title"
      className="scroll-mt-24 bg-brand px-gutter py-14 text-white lg:mx-4 lg:mt-4 lg:rounded-tile lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-6xl lg:grid lg:grid-cols-2 lg:items-start lg:gap-16">
        {/* Preview frame — desktop only; one frame, rows swap what it shows. */}
        <div className="sticky top-24 hidden lg:block" aria-hidden>
          <div className="relative aspect-[4/5] w-full max-w-[28rem] overflow-hidden rounded-[1.5rem] bg-[var(--neutral-900)]/20">
            {withPhoto.map((i) => (
              <SmoothImage
                key={i.slug}
                src={i.photoUrl as string}
                alt=""
                fill
                sizes="448px"
                className={cn(
                  "object-cover transition-opacity duration-[240ms] ease-[var(--ease-out)]",
                  shownSlug === i.slug ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
          {shown && (
            <p className="mt-4 inline-flex items-baseline gap-2 rounded-pill border border-white/25 bg-white/10 px-4 py-2 text-label font-bold backdrop-blur-md">
              {shown.name} <span className="tabular-nums opacity-80">· {shown.price}</span>
            </p>
          )}
        </div>

        <Reveal className="mx-auto w-full max-w-[40rem]">
        <div className="scallop-y w-full bg-surface-card px-7 py-16 text-text-primary lg:px-16 lg:py-20">
          <p className="mb-3 text-center text-label font-bold uppercase tracking-[0.16em] text-text-secondary">
            01 — Services
          </p>
          <h2 id="menu-title" className="text-center text-display">
            Services &amp; prices
          </h2>
          <p className="mt-2 text-center text-label text-text-secondary">
            Tap a service for details, or go straight to booking.
          </p>

          {groups.map((g) => (
            <div key={g.title} className="mt-14">
              <Reveal>
                <h3 className="text-center text-heading">{g.title}</h3>
              </Reveal>
              <ul className="mx-auto mt-6 max-w-[26rem] space-y-5">
                {g.items.map((i, n) => (
                  <li key={i.slug}>
                    <Reveal index={n % 5}>
                    <Link
                      href={`/services/${i.slug}`}
                      onMouseEnter={() => setHovered(i.slug)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(i.slug)}
                      onBlur={() => setHovered(null)}
                      className={cn(
                        "flex items-center gap-3 rounded-[var(--radius-sm)] transition-opacity duration-[240ms] ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand",
                        hovered && hovered !== i.slug && "opacity-50",
                      )}
                    >
                      {i.photoUrl && (
                        <SmoothImage
                          src={i.photoUrl}
                          alt=""
                          width={48}
                          height={48}
                          sizes="48px"
                          wrapperClassName="h-12 w-12 shrink-0 lg:hidden"
                          className="h-12 w-12 object-cover"
                        />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-4">
                          <span className="text-body font-bold">{i.name}</span>
                          <span className="text-body font-bold tabular-nums">{i.price}</span>
                        </span>
                        <span className="mt-0.5 block text-label text-text-secondary">
                          {i.description ? `${i.description} · ` : ""}
                          {i.duration}
                        </span>
                      </span>
                    </Link>
                    </Reveal>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <p className="mt-14 text-center text-label text-text-secondary">
            {hours.map((h) => (
              <span key={h} className="block">
                {h}
              </span>
            ))}
          </p>
        </div>
        </Reveal>
      </div>
    </section>
  );
}

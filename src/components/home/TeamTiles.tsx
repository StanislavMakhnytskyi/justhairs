import Link from "next/link";
import { LinkPendingBar } from "@/components/ui/LinkPendingBar";
import { Reveal } from "@/components/ui/Reveal";
import { SmoothImage } from "@/components/ui/SmoothImage";
import { Avatar } from "@/components/ui/primitives";
import { StarScore } from "./StarScore";
import type { Master } from "@/components/ui/MasterCard";

// Two flat tile colours, alternating. Text is pinned dark so the tiles read the
// same in both themes.
const TILES = ["bg-purple-100", "bg-purple-200"]; // taste-skill-ignore: the app's own brand purple

/** The team as a bento: the best-reviewed stylist as a large feature tile, the
 *  rest as portraits on colour tiles. Every tile opens the services that stylist
 *  offers. */
export function TeamTiles({ masters }: { masters: Master[] }) {
  // Feature = most reviewed, then best rated. Only when there are enough tiles
  // for the mosaic to close up; otherwise a plain grid.
  const score = (m: Master) => (m.rating?.review_count ?? 0) * 10 + (m.rating?.rating ?? 0);
  const featured = masters.length >= 5 ? [...masters].sort((a, b) => score(b) - score(a))[0] : null;
  const ordered = featured ? [featured, ...masters.filter((m) => m.id !== featured.id)] : masters;

  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className="scroll-mt-24 bg-surface-app px-gutter py-14 lg:mx-4 lg:mt-4 lg:rounded-tile lg:bg-surface-card lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-label font-bold uppercase tracking-[0.16em] text-text-secondary">
          02 — Team
        </p>
        <h2 id="team-title" className="text-display text-text-primary lg:text-hero">
          Our team
        </h2>

        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          {ordered.map((m, i) => {
            const big = featured && i === 0;
            return (
              <li key={m.id} className={big ? "md:col-span-2 md:row-span-2" : undefined}>
                <Reveal index={i % 4} className={big ? "h-full" : undefined}>
                  <Link
                    href={`/services?staff=${m.id}`}
                    className={`group relative flex overflow-hidden rounded-2xl text-[var(--neutral-900)] transition-transform duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand [@media(hover:hover)]:motion-safe:hover:-translate-y-1 ${
                      big ? "h-full flex-col" : "flex-col"
                    } ${TILES[i % TILES.length]}`}
                  >
                    <span
                      className={`relative block w-full overflow-hidden ${
                        big ? "aspect-[4/5] md:aspect-auto md:min-h-0 md:flex-1" : "aspect-[4/5]"
                      }`}
                    >
                      {m.photo_url ? (
                        <SmoothImage
                          src={m.photo_url}
                          alt=""
                          fill
                          sizes={big ? "(min-width: 1024px) 560px, 50vw" : "(min-width: 1024px) 272px, 50vw"}
                          className="object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="grid size-full place-items-center">
                          <Avatar name={m.name} size={96} />
                        </span>
                      )}
                    </span>
                    <span className={`block ${big ? "p-5 lg:p-6" : "p-4"}`}>
                      <span className={`block ${big ? "text-heading" : "text-subhead"}`}>{m.name}</span>
                      {m.title && <span className="block text-label opacity-80">{m.title}</span>}
                      {m.rating && m.rating.review_count > 0 && (
                        <span className="mt-2 block">
                          <StarScore rating={m.rating.rating} count={m.rating.review_count} />
                        </span>
                      )}
                      {big && (
                        <span className="mt-4 hidden text-label font-bold underline underline-offset-4 md:block">
                          See {m.name.split(" ")[0]}&rsquo;s services
                        </span>
                      )}
                    </span>
                    <LinkPendingBar />
                  </Link>
                </Reveal>
              </li>
            );
          })}
          <li className="col-span-2">
            <Reveal index={masters.length % 4} className="h-full">
              <Link
                href="/book"
                className="group relative flex h-full min-h-48 w-full flex-col justify-end rounded-2xl bg-brand p-5 text-white transition-transform duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand lg:p-7 [@media(hover:hover)]:motion-safe:hover:-translate-y-1"
              >
                <span className="text-heading">Not sure who to pick?</span>
                <span className="mt-2 max-w-[34ch] text-label opacity-90">
                  Choose any specialist and we&rsquo;ll book the first stylist who is free.
                </span>
                <span className="mt-4 text-label font-bold underline underline-offset-4">
                  Book now
                </span>
                <LinkPendingBar />
              </Link>
            </Reveal>
          </li>
        </ul>
      </div>
    </section>
  );
}

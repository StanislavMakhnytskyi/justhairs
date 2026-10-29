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

/** The team as portraits on colour tiles; each tile opens the services that
 *  stylist offers. */
export function TeamTiles({ masters }: { masters: Master[] }) {
  return (
    <section
      id="team"
      aria-labelledby="team-title"
      className="scroll-mt-16 bg-surface-app px-gutter py-14 lg:px-10 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <h2 id="team-title" className="text-display text-text-primary">
          Our team
        </h2>

        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 lg:gap-4">
          {masters.map((m, i) => (
            <li key={m.id}>
              <Reveal index={i % 4}>
                <Link
                  href={`/services?staff=${m.id}`}
                  className={`group relative block text-[var(--neutral-900)] transition-transform duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand [@media(hover:hover)]:motion-safe:hover:-translate-y-1 ${TILES[i % TILES.length]}`}
                >
                  <span className="relative block aspect-[4/5] w-full overflow-hidden">
                    {m.photo_url ? (
                      <SmoothImage
                        src={m.photo_url}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 272px, 50vw"
                        className="object-cover transition-transform duration-500 ease-[var(--ease-out)] group-hover:scale-[1.03]"
                      />
                    ) : (
                      <span className="grid size-full place-items-center">
                        <Avatar name={m.name} size={96} />
                      </span>
                    )}
                  </span>
                  <span className="block p-4">
                    <span className="block text-subhead">{m.name}</span>
                    {m.title && <span className="block text-label opacity-80">{m.title}</span>}
                    {m.rating && m.rating.review_count > 0 && (
                      <span className="mt-2 block">
                        <StarScore rating={m.rating.rating} count={m.rating.review_count} />
                      </span>
                    )}
                  </span>
                  <LinkPendingBar />
                </Link>
              </Reveal>
            </li>
          ))}
          <li>
            <Reveal index={masters.length % 4}>
              <Link
                href="/book"
                className="group relative flex aspect-[4/5] w-full flex-col justify-end bg-brand p-5 text-white transition-transform duration-150 ease-[var(--ease-out)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand lg:h-full lg:aspect-auto [@media(hover:hover)]:motion-safe:hover:-translate-y-1"
              >
                <span className="text-heading">Not sure who to pick?</span>
                <span className="mt-2 text-label opacity-90">
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

import { Reveal } from "@/components/ui/Reveal";
import { StarRating } from "@/components/ui/StarRating";
import { StarScore } from "./StarScore";

export type Slip = {
  id: string;
  rating: number;
  comment: string | null;
  reviewer: string;
  context: string | null;
};

// Torn edges: a zigzag along the top and bottom of each slip, built once as a
// clip-path so it scales with the slip's width.
const TEETH = 22;
const TOOTH = "7px";
function zigzag(): string {
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= TEETH; i++) {
    const x = ((i / TEETH) * 100).toFixed(2);
    top.push(`${x}% ${i % 2 ? TOOTH : "0"}`);
  }
  for (let i = TEETH; i >= 0; i--) {
    const x = ((i / TEETH) * 100).toFixed(2);
    bottom.push(`${x}% ${i % 2 ? `calc(100% - ${TOOTH})` : "100%"}`);
  }
  return `polygon(${[...top, ...bottom].join(", ")})`;
}
const TORN = zigzag();

const TILT = ["-rotate-3", "rotate-2", "-rotate-1"];
// Each slip sits at its own height so the row reads as loose paper, not a strip.
const DROP = ["md:mt-0", "md:mt-10", "md:mt-4"];

/** Reviews as paper slips, each torn along its edges and set at its own angle. */
export function ReviewSlips({
  reviews,
  overall,
}: {
  reviews: Slip[];
  overall: { rating: number; review_count: number } | null;
}) {
  return (
    <section
      id="reviews"
      aria-labelledby="reviews-title"
      className="scroll-mt-24 overflow-hidden bg-brand px-gutter py-14 text-white lg:mx-4 lg:mt-4 lg:rounded-tile lg:px-10 lg:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <p className="mb-3 text-label font-bold uppercase tracking-[0.16em] opacity-70">
          03 — Reviews
        </p>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <h2 id="reviews-title" className="text-display lg:text-hero">
            What clients say
          </h2>
          {overall && (
            <span className="rounded-pill border border-white/25 bg-white/10 px-4 py-2 backdrop-blur-md">
              <StarScore rating={overall.rating} count={overall.review_count} />
            </span>
          )}
        </div>

        {reviews.length > 0 ? (
          <ul className="mt-12 flex flex-col gap-10 md:flex-row md:items-start md:gap-8">
            {reviews.map((r, i) => (
              <li key={r.id} className={`md:flex-1 ${DROP[i % DROP.length]}`}>
                <Reveal index={i}>
                  {/* clip-path would clip the slip's own shadow, so the shadow
                      lives on a parent and follows the torn outline. */}
                  <div className={`drop-shadow-[0_16px_20px_rgb(9_16_29/0.3)] ${TILT[i % TILT.length]}`}>
                  <figure
                    className="bg-white px-7 py-10 text-[var(--neutral-900)]"
                    style={{ clipPath: TORN }}
                  >
                    <StarRating value={r.rating} size={18} />
                    {r.comment && (
                      <blockquote className="mt-4 text-body">&ldquo;{r.comment}&rdquo;</blockquote>
                    )}
                    <figcaption className="mt-5 text-label">
                      <span className="font-bold">{r.reviewer}</span>
                      {r.context && <span className="opacity-70"> · {r.context}</span>}
                    </figcaption>
                  </figure>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-8 max-w-[38ch] text-body">
            No reviews yet — be the first after your visit.
          </p>
        )}
      </div>
    </section>
  );
}

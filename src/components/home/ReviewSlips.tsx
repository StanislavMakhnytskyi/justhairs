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

const TILT = ["-rotate-2", "rotate-1", "-rotate-1"];

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
      className="scroll-mt-16 overflow-hidden bg-brand px-gutter py-14 text-white lg:px-10 lg:py-28"
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <h2 id="reviews-title" className="text-display">
            What clients say
          </h2>
          {overall && (
            <StarScore rating={overall.rating} count={overall.review_count} />
          )}
        </div>

        {reviews.length > 0 ? (
          <ul className="mt-12 flex flex-col gap-10 md:flex-row md:items-start md:gap-0 md:px-6">
            {reviews.map((r, i) => (
              <li key={r.id} className="md:-mx-3 md:flex-1">
                <Reveal index={i}>
                  <figure
                    className={`bg-white px-7 py-10 text-[var(--neutral-900)] ${TILT[i % TILT.length]}`}
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

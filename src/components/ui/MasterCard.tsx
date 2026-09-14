import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar, Card, RatingBadge } from "./primitives";
import { ChipRow } from "./Chip";
import { LinkPendingBar } from "./LinkPendingBar";
import type { Rating } from "@/lib/supabase/types";

export type Master = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  specialties: string[];
  hours: { open: string; off: string } | null;
  rating?: Rating;
};

const cardClass = "flex gap-4";

function MasterCardBody({ master }: { master: Master }) {
  const r = master.rating;
  return (
    <>
      <Avatar name={master.name} src={master.photo_url} size={64} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-subhead text-text-primary">{master.name}</p>
          {r && r.review_count > 0 && (
            <RatingBadge rating={r.rating} count={r.review_count} />
          )}
        </div>
        {master.title && (
          <p className="text-label text-text-secondary">{master.title}</p>
        )}
        {master.bio && (
          <p className="mt-2 text-label text-text-secondary">{master.bio}</p>
        )}

        {master.specialties.length > 0 && (
          <div className="mt-3">
            <ChipRow items={master.specialties} />
          </div>
        )}

        {master.hours && (
          <p className="mt-3 text-caption text-text-secondary">
            {master.hours.open}
            {master.hours.off ? ` · ${master.hours.off}` : ""}
          </p>
        )}
      </div>
    </>
  );
}

/** `href` makes the whole card a link (e.g. into the service list, filtered
 *  to what this stylist offers) — a trailing chevron signals that. */
export function MasterCard({ master, href }: { master: Master; href?: string }) {
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          cardClass,
          "relative overflow-hidden rounded-[var(--radius-md)] bg-surface-card p-4 pr-10 shadow-[var(--shadow-card)] transition-[box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:shadow-[var(--shadow-overlay)] motion-safe:active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2",
        )}
      >
        <MasterCardBody master={master} />
        <ChevronRight
          size={18}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary"
          aria-hidden
        />
        <LinkPendingBar />
      </Link>
    );
  }
  return (
    <Card className={cardClass}>
      <MasterCardBody master={master} />
    </Card>
  );
}

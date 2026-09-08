import { Avatar, Card, RatingBadge } from "./primitives";
import { ChipRow } from "./Chip";
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

export function MasterCard({ master }: { master: Master }) {
  const r = master.rating;
  return (
    <Card className="flex gap-4">
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
    </Card>
  );
}

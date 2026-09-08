import { formatDuration, formatPrice } from "@/lib/format";
import { SmoothImage } from "./SmoothImage";
import { RowShell } from "./RowShell";

export function ShopService({
  name,
  priceCents,
  durationMin,
  description,
  photoUrl,
  selected,
  href,
  onClick,
}: {
  name: string;
  priceCents: number;
  durationMin: number;
  description?: string | null;
  photoUrl?: string | null;
  selected?: boolean;
  href?: string;
  onClick?: () => void;
}) {
  return (
    <RowShell selected={selected} href={href} onClick={onClick}>
      {photoUrl && (
        <SmoothImage
          src={photoUrl}
          alt=""
          width={56}
          height={56}
          sizes="56px"
          wrapperClassName="h-14 w-14 shrink-0 rounded-[var(--radius-sm)]"
          className="h-14 w-14 object-cover"
        />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-subhead text-text-primary">{name}</p>
        {description && (
          <p className="mt-0.5 line-clamp-1 text-label text-text-secondary">
            {description}
          </p>
        )}
        <p className="mt-1 text-label text-text-secondary">
          {formatDuration(durationMin)} · {formatPrice(priceCents)}
        </p>
      </div>
    </RowShell>
  );
}

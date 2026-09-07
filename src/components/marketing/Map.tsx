const ADDRESS = "14 Parnell Street, Dublin 1, Ireland";

export function Map() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    ADDRESS,
  )}`;

  if (key) {
    return (
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-border-default">
        <iframe
          title="justhairs location"
          className="block h-44 w-full"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(
            ADDRESS,
          )}`}
        />
      </div>
    );
  }

  return (
    <a
      href={mapsLink}
      target="_blank"
      rel="noreferrer"
      className="flex h-44 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-border-default bg-surface-sunken text-center"
    >
      <span className="text-[14px] font-bold text-text-primary">{ADDRESS}</span>
      <span className="text-[13px] font-bold text-link">Open in Google Maps</span>
    </a>
  );
}

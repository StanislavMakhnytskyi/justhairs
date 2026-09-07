import { SALON } from "@/lib/salon";

const { lat, lon, addressOneLine } = SALON;

export function Map() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_EMBED_KEY;

  const src = key
    ? `https://www.google.com/maps/embed/v1/place?key=${key}&q=${encodeURIComponent(
        addressOneLine,
      )}&zoom=16`
    : `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.006}%2C${
        lat - 0.003
      }%2C${lon + 0.006}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lon}`;

  const link = key
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressOneLine)}`
    : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;

  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-border-default">
      <iframe
        title={`${SALON.name} location`}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block h-44 w-full border-0"
      />
      <a
        href={link}
        target="_blank"
        rel="noreferrer"
        className="block border-t border-border-default bg-surface-card px-4 py-2.5 text-[13px] font-bold text-link transition-colors hover:bg-surface-sunken hover:text-brand-hover"
      >
        Open in {key ? "Google Maps" : "OpenStreetMap"}
      </a>
    </div>
  );
}

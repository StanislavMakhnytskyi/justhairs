import { SALON } from "@/lib/salon";
import { LeafletMap } from "./LeafletMap";

const { lat, lon } = SALON;

export function Map() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-border-default">
      <LeafletMap />
      <a
        href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`}
        target="_blank"
        rel="noreferrer"
        className="block border-t border-border-default bg-surface-card px-4 py-2.5 text-[13px] font-bold text-link transition-colors hover:bg-surface-sunken hover:text-brand-hover"
      >
        Open full map
      </a>
    </div>
  );
}

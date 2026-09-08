import { SALON } from "@/lib/salon";
import { LeafletMap } from "./LeafletMap";
import { OpenInMaps } from "./OpenInMaps";

export function Map() {
  return (
    <div className="overflow-hidden rounded-[var(--radius-md)] border border-border-default">
      <LeafletMap />
      <OpenInMaps
        lat={SALON.lat}
        lon={SALON.lon}
        label={SALON.name}
        className="block border-t border-border-default bg-surface-card px-4 py-2.5 text-label font-bold text-link transition-colors hover:bg-surface-sunken hover:text-brand-hover"
      />
    </div>
  );
}

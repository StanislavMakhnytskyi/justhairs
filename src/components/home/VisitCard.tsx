import { Button } from "@/components/ui/Button";
import { LeafletMap } from "@/components/marketing/LeafletMap";
import { OpenInMaps } from "@/components/marketing/OpenInMaps";
import { SALON } from "@/lib/salon";

/** The street itself is the picture: a full-width map with the salon's visit
 *  card laid on it. */
export function VisitCard({ hours }: { hours: string[] }) {
  return (
    <section id="visit" aria-labelledby="visit-title" className="relative scroll-mt-16 bg-surface-app">
      {/* isolate: keep Leaflet's own z-indexes from climbing over the card. */}
      {/* The Esri/OSM attribution is required, so it stays, but inside the page margin. */}
      <div className="map-margins relative isolate">
        <LeafletMap className="h-[22rem] lg:h-[36rem]" />
      </div>

      <div className="relative z-[500] px-gutter py-6 pb-14 lg:absolute lg:inset-x-0 lg:top-14 lg:mt-0 lg:px-10 lg:pb-0 lg:pt-0">
        <div className="mx-auto max-w-6xl lg:flex lg:justify-end">
          <div className="bg-surface-card p-8 text-text-primary lg:w-[24rem]">
            <h2 id="visit-title" className="text-display">
              Visit us
            </h2>
            <address className="mt-5 space-y-0.5 text-body not-italic">
              {SALON.addressLines.map((l) => (
                <p key={l}>{l}</p>
              ))}
            </address>
            <p className="mt-4 text-label text-text-secondary">
              {hours.map((h) => (
                <span key={h} className="block">
                  {h}
                </span>
              ))}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <Button href="/book">Book appointment</Button>
              <OpenInMaps
                lat={SALON.lat}
                lon={SALON.lon}
                label={SALON.name}
                className="text-center text-label font-bold text-link transition-colors hover:text-brand-hover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

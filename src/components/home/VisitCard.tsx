import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { LeafletMap } from "@/components/marketing/LeafletMap";
import { OpenInMaps } from "@/components/marketing/OpenInMaps";
import { SALON } from "@/lib/salon";

/** The street itself is the picture: a rounded map tile with the salon's visit
 *  card laid on it, and (desktop) hours / booking tiles in the row beneath. */
export function VisitCard({ hours }: { hours: string[] }) {
  return (
    <section
      id="visit"
      aria-labelledby="visit-title"
      className="relative scroll-mt-24 bg-surface-app lg:mx-4 lg:mt-4 lg:bg-transparent"
    >
      <div className="relative lg:overflow-hidden lg:rounded-tile">
        {/* isolate: keep Leaflet's own z-indexes from climbing over the card. */}
        {/* The Esri/OSM attribution is required, so it stays, but inside the page margin. */}
        <div className="map-margins relative isolate">
          <LeafletMap className="h-[22rem] lg:h-[34rem]" />
        </div>

        <div className="relative z-[500] px-gutter py-6 pb-14 lg:absolute lg:inset-x-0 lg:top-12 lg:mt-0 lg:px-10 lg:pb-0 lg:pt-0">
          <div className="mx-auto max-w-6xl lg:flex lg:justify-end">
            <Reveal className="lg:w-[24rem]">
              <div className="bg-surface-card p-8 text-text-primary">
                <p className="mb-2 text-label font-bold uppercase tracking-[0.16em] text-text-secondary">
                  04 — Visit
                </p>
                <h2 id="visit-title" className="text-display">
                  Visit us
                </h2>
                <address className="mt-5 space-y-0.5 text-body not-italic">
                  {SALON.addressLines.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                </address>
                <p className="mt-4 text-label text-text-secondary lg:hidden">
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
            </Reveal>
          </div>
        </div>
      </div>

      <ul className="mx-auto mt-4 hidden max-w-none grid-cols-3 gap-4 lg:grid">
        <li className="rounded-tile bg-surface-card p-8 text-text-primary">
          <p className="text-label font-bold uppercase tracking-[0.16em] text-text-secondary">Hours</p>
          <p className="mt-4 text-heading">{hours[0]}</p>
          <p className="mt-1 text-body text-text-secondary">{hours[1]}</p>
        </li>
        <li className="rounded-tile bg-surface-card p-8 text-text-primary">
          <p className="text-label font-bold uppercase tracking-[0.16em] text-text-secondary">Find us</p>
          <p className="mt-4 text-heading">{SALON.addressLines[0]}</p>
          <p className="mt-1 text-body text-text-secondary">{SALON.addressLines.slice(1).join(", ")}</p>
        </li>
        <li className="rounded-tile bg-brand p-8 text-white">
          <p className="text-heading">Your chair is held the moment you book.</p>
          <Button href="/book" variant="white" className="mt-5">
            Book appointment
          </Button>
        </li>
      </ul>
    </section>
  );
}

import { Section } from "@/components/ui/Section";
import { Map } from "./Map";
import { SALON } from "@/lib/salon";

export function VisitUs({ hours }: { hours?: string }) {
  return (
    <Section id="visit" title="Visit us" className="lg:px-0">
      <div className="lg:grid lg:grid-cols-[1fr_2fr] lg:items-start lg:gap-8">
        <address className="mb-3 space-y-1 text-body not-italic text-text-primary lg:mb-0">
          <p>{SALON.addressLines.join(", ")}</p>
          <p className="text-text-secondary">{hours ?? "Tue–Sat · 9:00–18:00"}</p>
          <p className="text-text-secondary">Closed Sunday &amp; Monday</p>
        </address>
        <Map />
      </div>
    </Section>
  );
}

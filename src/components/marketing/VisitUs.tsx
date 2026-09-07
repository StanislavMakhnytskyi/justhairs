import { Section } from "@/components/ui/Section";
import { Map } from "./Map";
import { SALON } from "@/lib/salon";

export function VisitUs({ hours }: { hours?: string }) {
  return (
    <Section title="Visit us">
      <address className="mb-3 space-y-1 text-[14px] not-italic text-text-primary">
        <p>{SALON.addressLines.join(", ")}</p>
        <p className="text-text-secondary">{hours ?? "Tue–Sat · 9:00–18:00"}</p>
        <p className="text-text-secondary">Closed Sunday &amp; Monday</p>
      </address>
      <Map />
    </Section>
  );
}

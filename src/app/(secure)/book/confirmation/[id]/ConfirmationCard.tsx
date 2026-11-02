import { CalendarPlus, Mail, MapPin } from "lucide-react";
import { BookShell } from "@/components/ticket/BookShell";
import { OpenInMaps } from "@/components/marketing/OpenInMaps";
import { Button, button } from "@/components/ui/Button";
import { SummaryList, SummaryRow } from "@/components/ui/SummaryList";
import { formatDateTime, formatDuration, formatPrice } from "@/lib/format";
import { LEGAL_CONTACT, SALON } from "@/lib/salon";
import { ClearGuestDraft, CodeActions, RefreshStatus } from "./ConfirmationActions";


/** What the card says, per payment state. `confirming` = back from Stripe but
 *  the session isn't settled yet (the webhook may still land it). */
export type Outcome = "paid" | "pay_later" | "confirming" | "unpaid";

const COPY: Record<Outcome, { title: string; lead: string; payLine: string }> = {
  paid: {
    title: "You’re booked",
    lead: "Save your confirmation code below — it’s your reference at the salon.",
    payLine: "Paid in full",
  },
  pay_later: {
    title: "You’re booked",
    lead: "You’ll pay at the salon after your visit. Save your confirmation code below — it’s your reference.",
    payLine: "Pay after your visit, at the salon",
  },
  confirming: {
    title: "Confirming your payment…",
    lead: "Stripe hasn’t confirmed it yet. That usually takes a few seconds — check again in a moment. Please don’t pay a second time.",
    payLine: "Payment processing",
  },
  unpaid: {
    title: "Almost there — payment not completed",
    lead: "Your time is held for a short while. Pay now, or choose to pay at the salon, to finish booking.",
    payLine: "Payment not completed",
  },
};

export type ConfirmationData = {
  id: string;
  serviceName: string;
  staffName: string | null;
  startsAt: string;
  durationMin: number;
  priceCents: number;
  confirmationCode: string | null;
};

/** The appointment card, per outcome. Presentational (no data access), so
 *  the page decides the outcome and every variant can be rendered on its own. */
export function ConfirmationCard({
  appt,
  outcome,
}: {
  appt: ConfirmationData;
  outcome: Outcome;
}) {
  const copy = COPY[outcome];
  const booked = outcome === "paid" || outcome === "pay_later";

  return (
    <BookShell>
      <div className="flex flex-1 flex-col px-gutter pb-8 pt-10">
        <div className="text-center">
          <p className="text-label font-bold uppercase tracking-[0.14em] text-text-secondary">
            Appointment card
          </p>
          <h1 className="mt-3 text-display text-text-primary">{copy.title}</h1>
          <p className="mx-auto mt-2 max-w-[38ch] text-body text-text-secondary">{copy.lead}</p>
        </div>

        <div className="mt-8 flex flex-col gap-5">
          <SummaryList>
            <SummaryRow label="Service" value={appt.serviceName} />
            <SummaryRow label="Specialist" value={appt.staffName ?? "Any specialist"} />
            <SummaryRow label="When" value={formatDateTime(appt.startsAt)} />
            <SummaryRow label="Duration" value={formatDuration(appt.durationMin)} />
            <SummaryRow label="Total" value={formatPrice(appt.priceCents)} strong />
          </SummaryList>
          <p className="text-label text-text-secondary">{copy.payLine}</p>
        </div>

        <div className="mt-8 flex flex-col gap-2 print:hidden">
          {booked && <ClearGuestDraft appointmentId={appt.id} />}
          {outcome === "confirming" && <RefreshStatus />}
          {outcome === "unpaid" && (
            <Button href={`/book/pay/${appt.id}`} block>
              Complete payment
            </Button>
          )}
          {booked && (
            // A plain <a>: next/link would try to client-navigate to a file.
            <a
              href={`/book/confirmation/${appt.id}/calendar`}
              download="justhairs-appointment.ics"
              className={button({ block: true })}
            >
              <CalendarPlus size={18} aria-hidden />
              Add to calendar
            </a>
          )}
          <Button href="/" variant="text" block>
            Back to home
          </Button>
        </div>

        {/* Where and how to reach the salon. The salon publishes no phone
            number, so contact is the email address (a tel: link only belongs
            here once salon.ts has a real number). */}
        <section aria-labelledby="visit-heading" className="mt-8 flex flex-col gap-4">
          <div className="cut -mx-gutter" aria-hidden />
          <h2 id="visit-heading" className="text-heading text-text-primary">
            Finding us
          </h2>
          <div className="flex items-start gap-3">
            <MapPin size={20} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden />
            <div className="flex flex-col gap-1">
              <address className="text-body not-italic text-text-primary">
                {SALON.addressOneLine}
              </address>
              <OpenInMaps
                lat={SALON.lat}
                lon={SALON.lon}
                label={SALON.name}
                className="relative w-fit text-label font-bold text-link underline-offset-2 after:absolute after:-inset-x-1 after:-inset-y-3 after:content-[''] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand print:hidden"
              />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail size={20} className="mt-0.5 shrink-0 text-text-secondary" aria-hidden />
            <p className="text-body text-text-primary">
              <a
                href={`mailto:${LEGAL_CONTACT}?subject=${encodeURIComponent(
                  `Booking ${appt.confirmationCode ?? ""}`.trim(),
                )}`}
                className="font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {LEGAL_CONTACT}
              </a>
            </p>
          </div>
          {/* TODO (CODE_REVIEW.md #14): reschedule/cancel are deliberately not
              self-serve — the RPCs were dropped with the auth surface in
              migration 0003 and never replaced. */}
          <p className="text-caption text-text-secondary">
            Need to change or cancel? Email the salon with your confirmation code and
            we&rsquo;ll sort it out. Changes aren&rsquo;t available online yet.
          </p>
        </section>
      </div>

      {/* The tear-off stub: the code is the part the guest keeps. */}
      <div className="mt-auto bg-surface-card">
        <div className="cut" aria-hidden />
        <div className="relative flex items-center justify-between gap-4 px-gutter py-5">
          <div className="min-w-0">
            <p className="text-caption text-text-secondary">Confirmation code</p>
            <p className="text-display tabular-nums tracking-[0.18em] text-text-primary">
              {appt.confirmationCode ?? "—"}
            </p>
            {appt.confirmationCode && <CodeActions code={appt.confirmationCode} />}
          </div>
          {booked && (
            <span
              aria-hidden
              className="grid size-16 shrink-0 -rotate-6 place-items-center rounded-full border-4 border-double border-success text-center text-caption font-bold uppercase leading-tight tracking-wider text-success motion-safe:animate-stamp"
            >
              {outcome === "paid" ? "Paid" : "Booked"}
            </span>
          )}
        </div>
      </div>
    </BookShell>
  );
}

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { FacebookIcon, InstagramIcon } from "@/components/ui/SocialIcons";
import { LEGAL_CONTACT, SALON } from "@/lib/salon";

/** The invitation to act: a reply card lying on the page, its lower edge cropped
 *  by the section so it reads as an object, not a box. */
export function ReplyCard() {
  return (
    <section
      aria-labelledby="reply-title"
      className="overflow-hidden bg-brand px-gutter pt-16 text-white lg:px-10 lg:pt-28"
    >
      <div className="mx-auto grid max-w-6xl items-end gap-10 lg:grid-cols-12 lg:gap-8">
        <p className="max-w-[28ch] text-heading lg:col-span-4 lg:pb-24">
          Tuesday to Saturday, nine to six. Choose a service, a stylist and a time, and your
          chair is held.
        </p>

        <div className="tilt-1 -mb-[3.75rem] bg-surface-card px-8 pb-24 pt-10 text-center text-text-primary lg:tilt-2 lg:col-span-6 lg:col-start-7 lg:px-12 lg:pt-14">
          <h2 id="reply-title" className="text-display">
            Book your visit
          </h2>
          <p className="mx-auto mt-3 max-w-[32ch] text-body text-text-secondary">
            It takes under a minute, and you can pick any stylist or the first one free.
          </p>
          <Button href="/book" block className="mt-7 h-14">
            Book appointment
          </Button>
        </div>
      </div>
    </section>
  );
}

/** The back of the card: sign-off on one side, the address block on the other. */
export function BackOfCard() {
  return (
    <footer className="bg-[var(--neutral-900)] px-gutter pt-14 lg:px-10 lg:pt-20">
      <div className="scallop-top mx-auto max-w-6xl bg-surface-card px-7 pb-8 pt-20 text-text-primary lg:px-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-display">See you soon.</p>
            <p className="mt-4 max-w-[38ch] text-body text-text-secondary">
              justhairs is a demo / portfolio project, not a real salon. Test mode: no real
              payments or appointments.
            </p>
          </div>

          <address className="space-y-3 text-subhead not-italic">
            <p>
              <a href={`mailto:${LEGAL_CONTACT}`} className="transition-colors hover:text-brand">
                {LEGAL_CONTACT}
              </a>
            </p>
            <p>{SALON.addressOneLine}</p>
            <p className="flex gap-4 pt-1 text-text-tertiary">
              <a
                href={SALON.instagram}
                target="_blank"
                rel="noreferrer"
                aria-label="justhairs on Instagram"
                className="transition-colors hover:text-brand"
              >
                <InstagramIcon />
              </a>
              <a
                href={SALON.facebook}
                target="_blank"
                rel="noreferrer"
                aria-label="justhairs on Facebook"
                className="transition-colors hover:text-brand"
              >
                <FacebookIcon />
              </a>
            </p>
          </address>
        </div>

        <p className="mt-14 flex flex-wrap justify-center gap-x-5 gap-y-2 text-center text-label text-text-secondary">
          <span>&copy; justhairs</span>
          <Link href="/privacy" className="font-bold text-link">
            Privacy Policy
          </Link>
          <Link href="/terms" className="font-bold text-link">
            Terms of Service
          </Link>
        </p>
      </div>
    </footer>
  );
}

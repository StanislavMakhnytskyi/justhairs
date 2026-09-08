import Link from "next/link";
import { FacebookIcon, InstagramIcon } from "@/components/ui/SocialIcons";
import { SALON } from "@/lib/salon";

export function PageFooter() {
  return (
    <footer className="border-t border-border-default px-gutter py-6 text-caption text-text-secondary">
      <div className="flex gap-3">
        <a
          href={SALON.instagram}
          target="_blank"
          rel="noreferrer"
          aria-label="justhairs on Instagram"
          className="text-text-tertiary transition-colors hover:text-brand"
        >
          <InstagramIcon />
        </a>
        <a
          href={SALON.facebook}
          target="_blank"
          rel="noreferrer"
          aria-label="justhairs on Facebook"
          className="text-text-tertiary transition-colors hover:text-brand"
        >
          <FacebookIcon />
        </a>
      </div>

      <p className="mt-4">
        justhairs is a demo / portfolio project — not a real salon. Test mode; no real
        payments or appointments.
      </p>
      <p className="mt-2 flex gap-4">
        <Link href="/privacy" className="font-bold text-link">
          Privacy Policy
        </Link>
        <Link href="/terms" className="font-bold text-link">
          Terms of Service
        </Link>
      </p>
    </footer>
  );
}

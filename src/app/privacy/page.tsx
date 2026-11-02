import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Prose } from "@/components/ui/Prose";
import { LEGAL_CONTACT } from "@/lib/salon";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How the justhairs demo handles data.",
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <TopBar title="Privacy Policy" />
      <div className="p-gutter">
        <Prose>
          <p className="text-label text-text-secondary">Last updated 7 September 2026</p>

          <h2>1. About this project</h2>
          <p>
            justhairs is a <strong>demonstration / portfolio project</strong>. It is
            not a real salon, business, or commercial service. The name, address,
            stylists, prices, reviews and appointments shown are fictional sample data.
            The app runs in <strong>test mode</strong> only.
          </p>

          <h2>2. What we collect</h2>
          <p>There are no user accounts. When you make a booking we store:</p>
          <ul>
            <li>the name, email and phone number you enter to hold the appointment,</li>
            <li>the demo appointment itself (service, stylist, time).</li>
          </ul>
          <p>
            Card details are handled entirely by{" "}
            <a href="https://stripe.com" target="_blank" rel="noreferrer">
              Stripe
            </a>{" "}
            in <strong>test mode</strong> and never touch this app&rsquo;s servers or
            database. No real money moves.
          </p>

          <h2>3. How it is stored</h2>
          <p>
            Bookings are held in a{" "}
            <a href="https://supabase.com" target="_blank" rel="noreferrer">
              Supabase
            </a>{" "}
            (PostgreSQL) database. Anonymous, aggregate page-view counts are
            collected via Vercel Web Analytics (no cookies, no personal identifiers).
          </p>

          <h2>4. Sharing</h2>
          <p>
            We do not sell or share your data. It is processed only by the
            infrastructure providers above (Supabase, Vercel, and Stripe for test
            payments) to operate the demo.
          </p>

          <h2>5. Your choices</h2>
          <p>
            To have a booking and its contact details deleted, contact{" "}
            <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>.
          </p>

          <h2>6. No warranty</h2>
          <p>
            This project is provided <strong>&ldquo;as is&rdquo;</strong>, with no
            warranty of any kind and no liability for any loss arising from its use.
            It may change or be taken offline at any time without notice.
          </p>

          <h2>7. Contact</h2>
          <p>
            Questions: <a href={`mailto:${LEGAL_CONTACT}`}>{LEGAL_CONTACT}</a>
          </p>
        </Prose>
      </div>
    </AppShell>
  );
}

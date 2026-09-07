import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Prose } from "@/components/ui/Prose";
import { LEGAL_CONTACT } from "@/lib/salon";

export const metadata: Metadata = {
  title: "Terms of Service — justhairs",
  description: "Terms for using the justhairs demo.",
};

export default function TermsPage() {
  return (
    <AppShell>
      <TopBar title="Terms of Service" />
      <div className="p-6">
        <Prose>
          <p className="text-[13px] text-text-secondary">
            Last updated 7 September 2026
          </p>

          <h2>1. Demonstration only</h2>
          <p>
            justhairs is a <strong>portfolio / demonstration project</strong> that
            shows how an online salon-booking product could work. It is{" "}
            <strong>not a real business</strong>. There is no physical salon, no real
            staff, and no real appointments. All salon information, services, prices,
            stylists and reviews are fictional sample data.
          </p>

          <h2>2. Bookings and payments</h2>
          <p>
            Any &ldquo;booking&rdquo; you make exists only inside this demo database
            and confers no right to any service. The app runs in{" "}
            <strong>test mode</strong>: no payment is taken, no card details are
            collected, and any payment interfaces shown are non-functional or use test
            credentials.
          </p>

          <h2>3. Acceptable use</h2>
          <p>
            Use the demo for evaluation and personal interest only. Do not attempt to
            disrupt the service, abuse the sign-in system, or upload unlawful content.
            Accounts and data may be reset or removed at any time.
          </p>

          <h2>4. Availability</h2>
          <p>
            The project is offered on a best-effort basis and may be changed,
            interrupted, or discontinued at any time without notice.
          </p>

          <h2>5. No warranty; no liability</h2>
          <p>
            The project is provided <strong>&ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;</strong>, without warranties of any kind, express or
            implied. To the fullest extent permitted by law, the project owner accepts{" "}
            <strong>no responsibility or liability</strong> for any loss or damage
            arising from your use of, or reliance on, the project.
          </p>

          <h2>6. Privacy</h2>
          <p>
            See the{" "}
            <a href="/privacy">Privacy Policy</a> for how limited data is handled.
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

import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { TopBar } from "@/components/ui/TopBar";
import { Prose } from "@/components/ui/Prose";
import { LEGAL_CONTACT } from "@/lib/salon";

export const metadata: Metadata = {
  title: "Privacy Policy — justhairs",
  description: "How the justhairs demo handles data.",
};

export default function PrivacyPage() {
  return (
    <AppShell>
      <TopBar title="Privacy Policy" />
      <div className="p-6">
        <Prose>
          <p className="text-[13px] text-text-secondary">
            Last updated 7 September 2026
          </p>

          <h2>1. About this project</h2>
          <p>
            justhairs is a <strong>demonstration / portfolio project</strong>. It is
            not a real salon, business, or commercial service. The name, address,
            stylists, prices, reviews and appointments shown are fictional sample data.
            The app runs in <strong>test mode</strong> only.
          </p>

          <h2>2. What we collect</h2>
          <p>When you sign in, we store the minimum needed to run the demo:</p>
          <ul>
            <li>
              your name and email address (from Google sign-in or the email you enter),
            </li>
            <li>
              optional profile details you choose to add (phone, birthday, preferred
              stylist, notification preference),
            </li>
            <li>the demo appointments and reviews you create in the app.</li>
          </ul>
          <p>
            We do <strong>not</strong> collect payment card details. No real payments
            are processed.
          </p>

          <h2>3. How it is stored</h2>
          <p>
            Data is held in a{" "}
            <a href="https://supabase.com" target="_blank" rel="noreferrer">
              Supabase
            </a>{" "}
            (PostgreSQL) database and authenticated through Supabase Auth. Anonymous,
            aggregate page-view counts are collected via Vercel Web Analytics (no
            cookies, no personal identifiers).
          </p>

          <h2>4. Sharing</h2>
          <p>
            We do not sell or share your data. It is processed only by the
            infrastructure providers above (Supabase, Vercel, and Google for sign-in)
            to operate the demo.
          </p>

          <h2>5. Your choices</h2>
          <p>
            You can edit your profile in the app, sign out at any time, or request
            deletion of your account and associated data by contacting{" "}
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

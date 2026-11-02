import Stripe from "stripe";

// Stripe client. Used by the booking payment step to open a Checkout session,
// by the confirmation page to verify it on return, and by the webhook route
// (/api/stripe/webhook, STRIPE_WEBHOOK_SECRET) as the source of truth.
// Null when STRIPE_SECRET_KEY is unset — the app then only offers "pay later".
const key = process.env.STRIPE_SECRET_KEY;

if (key?.startsWith("sk_live_")) {
  // The checkout copy ("use card 4242…") and the whole flow are demo-grade.
  console.warn(
    "[stripe] a LIVE secret key is configured, but this app is a demo (no refunds, no email, test-card copy). Use sk_test_ keys.",
  );
}

export const stripe = key ? new Stripe(key) : null;

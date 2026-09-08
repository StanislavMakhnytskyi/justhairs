import Stripe from "stripe";

// Test-mode Stripe client. Used by the booking payment step to open a Checkout
// session; the confirmation page verifies the session on return (no webhook).
// Null when STRIPE_SECRET_KEY is unset — the app then only offers "pay later".
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

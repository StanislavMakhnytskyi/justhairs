import Stripe from "stripe";

// Test-mode Stripe client. Payment flows land in Milestone 2 — this is wired
// so the webhook route and future checkout sessions have a shared instance.
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe);

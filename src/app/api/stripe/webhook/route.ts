import { stripe } from "@/lib/stripe";
import { paymentStore } from "@/lib/payments";
import { handleStripeWebhook } from "@/lib/stripe-webhook";

/** Stripe -> us. Authenticated only by the signature on the raw body. */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    console.error("[stripe] webhook called but STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET is not set");
    return new Response("Webhook not configured", { status: 503 });
  }
  // The raw text, untouched: parsing it first would break the signature check.
  const payload = await req.text();
  const { status, body } = await handleStripeWebhook({
    payload,
    signature: req.headers.get("stripe-signature"),
    secret,
    stripe,
    store: paymentStore,
  });
  return new Response(body, { status });
}

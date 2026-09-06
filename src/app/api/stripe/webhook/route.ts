import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

// Signature-verified skeleton. Milestone 2 will mark orders/payments paid here.
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "payment_intent.succeeded":
      // TODO(M2): look up order by metadata, set status = 'paid', insert payment row.
      console.info(`[stripe] received ${event.type}`, event.id);
      break;
    default:
      console.info(`[stripe] unhandled ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

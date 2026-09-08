import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/server";

// Marks an appointment paid once Stripe confirms the Checkout session.
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const appointmentId = session.metadata?.appointment_id;
    if (appointmentId && session.payment_status === "paid") {
      const { error } = await createAdminClient()
        .from("appointments")
        .update({ payment_status: "paid" })
        .eq("id", appointmentId);
      if (error) {
        console.error(`[stripe] failed to mark ${appointmentId} paid`, error);
        return NextResponse.json({ error: "db update failed" }, { status: 500 });
      }
      console.info(`[stripe] appointment ${appointmentId} paid`);
    }
  } else {
    console.info(`[stripe] unhandled ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

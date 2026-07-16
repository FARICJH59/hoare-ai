import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

function supabaseAdmin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey, { appInfo: { name: "HOARE.ai Web", version: "1.0.0" } });
  const body = await request.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid Stripe webhook signature." },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  if (supabase && ["checkout.session.completed", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription;
    const subscriptionId = "subscription" in object && typeof object.subscription === "string" ? object.subscription : object.id;
    const customerId = typeof object.customer === "string" ? object.customer : object.customer?.id;
    const status = "status" in object && typeof object.status === "string" ? object.status : event.type;
    const userId = "metadata" in object ? object.metadata?.supabaseUserId : undefined;

    const { error } = await supabase.from("subscriptions").upsert({
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: customerId,
      supabase_user_id: userId ?? null,
      status,
      latest_event_type: event.type,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return NextResponse.json({ error: "Failed to persist Stripe subscription event." }, { status: 500 });
    }
  }

  if (supabase && ["invoice.paid", "invoice.payment_failed"].includes(event.type)) {
    const invoice = event.data.object as Stripe.Invoice;
    const status = event.type === "invoice.paid" ? "PAID" : "FAILED";
    const { error } = await supabase
      .from("billing_invoices")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("stripe_invoice_id", invoice.id);
    if (error) {
      return NextResponse.json({ error: "Failed to sync Stripe invoice status." }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true, type: event.type });
}

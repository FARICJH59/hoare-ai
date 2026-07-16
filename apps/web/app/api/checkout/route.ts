import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
function appUrl(request: NextRequest) { return process.env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin; }
export async function POST(request: NextRequest) {
  if (!hasSupabaseConfig()) { return NextResponse.redirect(new URL("/sign-in?error=missing-config", request.url)); }
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { return NextResponse.redirect(new URL("/sign-in?redirect=/dashboard", request.url)); }
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripeSecretKey || !priceId) { return NextResponse.redirect(new URL("/dashboard?billing=missing-config", request.url)); }
  const stripe = new Stripe(stripeSecretKey, { appInfo: { name: "HOARE.ai Web", version: "1.0.0" } });
  const baseUrl = appUrl(request);
  const session = await stripe.checkout.sessions.create({
    mode: "subscription", payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email ?? undefined, client_reference_id: user.id,
    metadata: { supabaseUserId: user.id },
    subscription_data: { metadata: { supabaseUserId: user.id } },
    success_url: `${baseUrl}/dashboard?checkout=success`,
    cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
  });
  if (!session.url) { return NextResponse.redirect(new URL("/dashboard?billing=checkout-failed", request.url)); }
  return NextResponse.redirect(session.url, 303);
}

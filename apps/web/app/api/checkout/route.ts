import { NextResponse, type NextRequest } from "next/server";
import Stripe from "stripe";
import { getEnv, getRequiredEnv, getRequiredUrlEnv } from "@/lib/env";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getRequestId, logError, logInfo } from "@/lib/observability";

export const dynamic = "force-dynamic";
export const maxDuration = 10;

function redirectToDashboard(request: NextRequest, params: Record<string, string>) {
  const url = new URL("/dashboard", request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request.headers);

  try {
    if (!hasSupabaseConfig()) {
      return NextResponse.redirect(new URL("/sign-in?error=missing-config", request.url));
    }

    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/sign-in?redirect=/dashboard", request.url));
    }

    if (!getEnv("STRIPE_SECRET_KEY") || !getEnv("STRIPE_PRICE_ID")) {
      return redirectToDashboard(request, { billing: "missing-config" });
    }

    const stripe = new Stripe(getRequiredEnv("STRIPE_SECRET_KEY"), {
      appInfo: { name: "HOARE.ai Web", version: "1.0.0" },
    });

    const baseUrl = getRequiredUrlEnv("NEXT_PUBLIC_APP_URL");
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: getRequiredEnv("STRIPE_PRICE_ID"), quantity: 1 }],
      customer_email: user.email ?? undefined,
      client_reference_id: user.id,
      metadata: { supabaseUserId: user.id, requestId },
      success_url: `${baseUrl}/dashboard?checkout=success`,
      cancel_url: `${baseUrl}/dashboard?checkout=cancelled`,
    });

    if (!session.url) {
      logError("Stripe checkout session did not include a redirect URL", { requestId, userId: user.id });
      return redirectToDashboard(request, { billing: "checkout-failed" });
    }

    logInfo("Stripe checkout session created", { requestId, userId: user.id, sessionId: session.id });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    logError("Stripe checkout failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown checkout error",
    });
    return redirectToDashboard(request, { billing: "checkout-failed", requestId });
  }
}

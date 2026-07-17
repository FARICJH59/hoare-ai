import { DashboardOverview } from "./components/DashboardOverview";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function billingMsg(c?: string) {
  return c === "missing-config" ? "Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID." : c === "checkout-failed" ? "Stripe did not return a checkout URL." : null;
}

function checkoutMsg(c?: string) {
  return c === "success" ? "Checkout completed." : c === "cancelled" ? "Checkout cancelled." : null;
}

export default async function DashboardPage({ searchParams }: { searchParams: { billing?: string; checkout?: string } }) {
  const supabaseConfigured = hasSupabaseConfig();
  let signedInAs: string | undefined;

  if (supabaseConfigured) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    signedInAs = user?.email ?? undefined;
  }

  return (
    <DashboardOverview
      signedInAs={signedInAs}
      supabaseConfigured={supabaseConfigured}
      billing={billingMsg(searchParams.billing)}
      checkout={checkoutMsg(searchParams.checkout)}
    />
  );
}

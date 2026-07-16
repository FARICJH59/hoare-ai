import { NextResponse } from "next/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function check(name: string, ok: boolean, detail: string) {
  return { name, ok, detail };
}

export async function POST() {
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
  const checks = [
    check("Supabase public config", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), "Required for browser and middleware authentication."),
    check("Supabase service config", Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), "Required by the API for durable runtime persistence."),
    check("Stripe checkout config", Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID), "Required before users can start subscription checkout."),
    check("Stripe webhook config", Boolean(process.env.STRIPE_WEBHOOK_SECRET), "Required before subscription state can be trusted server-side."),
    check("Backend API URL", Boolean(apiUrl), "Required for health, agent, workflow, and capability panels."),
    check("Backend API key", Boolean(process.env.HOARE_API_KEY), "Required for server-side web panels to read protected backend API routes in production."),
    check("Energy search provider", Boolean(process.env.WEB_SEARCH_ENDPOINT), "Optional external grid/carbon context provider for EnergyAgent."),
  ];

  try {
    const res = await fetch(`${apiUrl}/health`, { cache: "no-store" });
    checks.push(check("Backend health endpoint", res.ok, res.ok ? "Backend health endpoint responded." : `Backend returned ${res.status}.`));
  } catch {
    checks.push(check("Backend health endpoint", false, "Backend health endpoint is unreachable from the web app."));
  }

  return NextResponse.json({
    status: checks.every((item) => item.ok) ? "pass" : "needs-attention",
    generatedAt: new Date().toISOString(),
    checks,
  });
}

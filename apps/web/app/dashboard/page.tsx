import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "../sign-in/actions";
import { DryBuildAuditButton } from "./DryBuildAuditButton";
import { apiClient } from "@/lib/api";
export const dynamic = "force-dynamic";
function billingMsg(c?: string) { return c === "missing-config" ? "Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID." : c === "checkout-failed" ? "Stripe did not return a checkout URL." : null; }
function checkoutMsg(c?: string) { return c === "success" ? "Checkout completed." : c === "cancelled" ? "Checkout cancelled." : null; }
export default async function DashboardPage({ searchParams }: { searchParams: { billing?: string; checkout?: string } }) {
  if (!hasSupabaseConfig()) {
    return (<main className="p-8 max-w-5xl mx-auto"><h1 className="text-3xl font-bold mb-6">Dashboard</h1><div className="rounded-lg border border-yellow-700 bg-yellow-950/40 p-6 text-yellow-100">Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</div></main>);
  }
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/sign-in?redirect=/dashboard"); }
  const billing = billingMsg(searchParams.billing);
  const checkout = checkoutMsg(searchParams.checkout);
  const [health, sessions, workflows] = await Promise.all([
    apiClient.health().catch(() => null),
    apiClient.listSessions().catch(() => []),
    apiClient.listWorkflows().catch(() => ({ count: 0, workflows: [], recentJobs: [] })),
  ]);
  const dashboardStats = [
    { label: "Active Agents", value: String(health?.agents.active ?? sessions.length) },
    { label: "Workflows Run", value: String(workflows.recentJobs.length) },
    { label: "API Health", value: health ? health.status : "unknown" },
  ];
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-2 text-sm text-gray-400">Signed in as {user.email}</p></div>
        <form action={signOutAction}><button className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium hover:border-blue-500">Sign out</button></form>
      </div>
      {billing && (<div className="mb-6 rounded-lg border border-yellow-700 bg-yellow-950/40 p-4 text-sm text-yellow-100">{billing}</div>)}
      {checkout && (<div className="mb-6 rounded-lg border border-blue-700 bg-blue-950/40 p-4 text-sm text-blue-100">{checkout}</div>)}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {dashboardStats.map(({label,value})=>(<div key={label} className="rounded-lg border border-gray-700 bg-gray-900 p-6"><p className="text-sm text-gray-400">{label}</p><p className="mt-2 text-4xl font-bold text-blue-400">{value}</p></div>))}
      </div>
      <section className="mt-8 rounded-lg border border-gray-700 bg-gray-900 p-6">
        <h2 className="text-xl font-semibold">Subscription</h2>
        <p className="mt-2 text-sm text-gray-400">Start Stripe Checkout for the configured subscription price.</p>
        <form action="/api/checkout" method="post" className="mt-4"><button className="rounded-md bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-400">Start checkout</button></form>
      </section>
      <DryBuildAuditButton />
    </main>
  );
}

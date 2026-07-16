import Link from "next/link";
import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signOutAction } from "../sign-in/actions";

export const dynamic = "force-dynamic";

function billingMsg(c?: string) {
  return c === "missing-config" ? "Stripe not configured. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID." : c === "checkout-failed" ? "Stripe did not return a checkout URL." : null;
}

function checkoutMsg(c?: string) {
  return c === "success" ? "Checkout completed." : c === "cancelled" ? "Checkout cancelled." : null;
}

const enterpriseLinks = [
  ["IP Disclosure", "/enterprise/ip-disclosure-hoare-ai"],
  ["Security Policy", "/enterprise/security-policy"],
  ["SLA", "/enterprise/sla"],
  ["Tenant Isolation", "/enterprise/tenant-isolation"],
  ["Data Governance", "/enterprise/data-governance"],
];

const domainUsage = [
  ["Energy", 82],
  ["Robotics", 64],
  ["Finance", 71],
  ["ML", 93],
  ["Quantum", 48],
  ["CV", 57],
];

export default async function DashboardPage({ searchParams }: { searchParams: { billing?: string; checkout?: string } }) {
  if (!hasSupabaseConfig()) {
    return <main className="p-8 max-w-5xl mx-auto"><h1 className="text-3xl font-bold mb-6">Dashboard</h1><div className="rounded-lg border border-yellow-700 bg-yellow-950/40 p-6 text-yellow-100">Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.</div></main>;
  }
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?redirect=/dashboard");
  const billing = billingMsg(searchParams.billing);
  const checkout = checkoutMsg(searchParams.checkout);

  return (
    <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 p-8 lg:grid-cols-[260px_1fr]">
      <aside className="rounded-lg border border-gray-700 bg-gray-900 p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Enterprise</h2>
        <nav className="mt-4 flex flex-col gap-2">
          {enterpriseLinks.map(([label, href]) => <Link key={href} href={href} className="rounded-md px-3 py-2 text-sm text-gray-200 hover:bg-gray-800">{label}</Link>)}
          <Link href="/docs/integration/hoare-agent" className="rounded-md px-3 py-2 text-sm text-blue-300 hover:bg-gray-800">Agent Integration Docs</Link>
        </nav>
      </aside>

      <section>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="text-3xl font-bold">Dashboard</h1><p className="mt-2 text-sm text-gray-400">Signed in as {user.email}</p></div>
          <form action={signOutAction}><button className="rounded-md border border-gray-700 px-4 py-2 text-sm font-medium hover:border-blue-500">Sign out</button></form>
        </div>
        {billing && <div className="mb-6 rounded-lg border border-yellow-700 bg-yellow-950/40 p-4 text-sm text-yellow-100">{billing}</div>}
        {checkout && <div className="mb-6 rounded-lg border border-blue-700 bg-blue-950/40 p-4 text-sm text-blue-100">{checkout}</div>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[{ label: "Active Agents", value: "–" }, { label: "Workflows Run", value: "–" }, { label: "API Requests", value: "–" }, { label: "DevOps Risk", value: "Live" }].map(({ label, value }) => <div key={label} className="rounded-lg border border-gray-700 bg-gray-900 p-6"><p className="text-sm text-gray-400">{label}</p><p className="mt-2 text-3xl font-bold text-blue-400">{value}</p></div>)}
        </div>

        <section className="mt-8 rounded-lg border border-gray-700 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">DevOps Risk</h2>
          <p className="mt-2 text-sm text-gray-400">Latest score is exposed by /api/devops/risk with events for deployment logs, env vars, Stripe, Supabase, governance, energy telemetry, workflow durability, and tool safety.</p>
        </section>

        <section className="mt-8 rounded-lg border border-gray-700 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">Domain Tool Usage</h2>
          <div className="mt-4 space-y-3">
            {domainUsage.map(([label, value]) => <div key={label} className="grid grid-cols-[100px_1fr_40px] items-center gap-3 text-sm"><span className="text-gray-300">{label}</span><span className="h-2 rounded bg-gray-800"><span className="block h-2 rounded bg-blue-500" style={{ width: `${value}%` }} /></span><span className="text-right text-gray-400">{value}</span></div>)}
          </div>
        </section>

        <section className="mt-8 rounded-lg border border-gray-700 bg-gray-900 p-6">
          <h2 className="text-xl font-semibold">Subscription</h2>
          <p className="mt-2 text-sm text-gray-400">Start Stripe Checkout for the configured subscription price.</p>
          <form action="/api/checkout" method="post" className="mt-4"><button className="rounded-md bg-blue-500 px-4 py-2 font-medium text-white hover:bg-blue-400">Start checkout</button></form>
        </section>
      </section>
    </main>
  );
}

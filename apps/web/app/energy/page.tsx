import { redirect } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listEnergyOverview, recordObservabilityDashboardView } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function EnergyPage({
  searchParams,
}: {
  searchParams: { orgId?: string; regionId?: string; facilityId?: string };
}) {
  let userOrgId = searchParams.orgId;
  if (hasSupabaseConfig()) {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/sign-in?redirect=/energy");
    userOrgId = user.id;
  }

  await recordObservabilityDashboardView("energy", userOrgId).catch(() => null);
  const data = await listEnergyOverview(userOrgId, searchParams.regionId, searchParams.facilityId).catch(() => null);
  const facilities = (data?.facilities ?? []).filter((facility) =>
    searchParams.facilityId ? facility.id === searchParams.facilityId : true
  );
  const recentActions = (data?.recentActions ?? []).filter((action) =>
    searchParams.facilityId ? action.facilityId === searchParams.facilityId : true
  );

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Energy Grid Optimization</h1>
      <p className="text-gray-400">Regional stress, facility load, and governed energy actions.</p>

      <form className="mt-6 grid gap-3 sm:grid-cols-3">
        <input name="orgId" defaultValue={userOrgId ?? ""} placeholder="Org ID" className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm" />
        <input name="regionId" defaultValue={searchParams.regionId ?? ""} placeholder="Region ID" className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm" />
        <input name="facilityId" defaultValue={searchParams.facilityId ?? ""} placeholder="Facility ID" className="rounded border border-gray-700 bg-gray-900 px-3 py-2 text-sm" />
        <button className="rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 sm:col-span-3">Apply filters</button>
      </form>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Regions</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {(data?.regions ?? []).map((region) => (
            <div key={region.id} className="rounded-lg border border-gray-700 bg-gray-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold">{region.name}</h3>
                  <p className="text-sm text-gray-500">{region.gridOperator} · {region.timezone}</p>
                </div>
                <span className="rounded-full border border-blue-700 px-3 py-1 text-xs text-blue-200">{region.stressLevel}</span>
              </div>
              <p className="mt-3 text-sm text-gray-400">Load: {region.currentLoad} / {region.maxCapacity} kW</p>
              <p className="text-sm text-gray-400">Carbon intensity: {region.carbonIntensity}</p>
            </div>
          ))}
          {!data?.regions.length && <div className="rounded-lg border border-gray-700 bg-gray-900 p-5 text-gray-400">No regions found.</div>}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Facilities</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-700">
          {facilities.length === 0 ? (
            <div className="bg-gray-900 p-5 text-gray-400">No facilities found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-400"><tr><th className="p-3">Name</th><th className="p-3">Type</th><th className="p-3">Baseline Load</th><th className="p-3">Criticality</th></tr></thead>
              <tbody>
                {facilities.map((facility) => (
                  <tr key={facility.id} className="border-t border-gray-800">
                    <td className="p-3">{facility.name}</td><td className="p-3">{facility.type}</td><td className="p-3">{facility.baselineLoad} kW</td><td className="p-3">{facility.criticalityLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Recent Energy Actions</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-700">
          {recentActions.length === 0 ? (
            <div className="bg-gray-900 p-5 text-gray-400">No recent energy actions.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-400"><tr><th className="p-3">Action</th><th className="p-3">Governance</th><th className="p-3">Status</th><th className="p-3">Time</th></tr></thead>
              <tbody>
                {recentActions.map((action) => (
                  <tr key={action.id} className="border-t border-gray-800">
                    <td className="p-3">{action.actionType}</td><td className="p-3">{action.governanceDecision}</td><td className="p-3">{action.status}</td><td className="p-3 text-gray-500">{new Date(action.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}

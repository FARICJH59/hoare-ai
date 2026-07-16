export default function TenantIsolationPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Tenant Isolation</h1>
      <p className="mt-4 text-gray-300">Every external API surface requires an org context and scopes sessions, workflow runs, billing usage, governance decisions, audit logs, and DevOps risk scores to that org.</p>
      <p className="mt-4 text-gray-300">New database tables include org_id, indexes, and RLS policies so persistence follows the same isolation model as runtime routes.</p>
    </main>
  );
}

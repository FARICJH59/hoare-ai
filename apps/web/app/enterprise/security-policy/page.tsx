export default function SecurityPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Security Policy</h1>
      <p className="mt-4 text-gray-300">HOARE.ai uses authenticated access, org isolation, governed execution, metered operations, and audit logging for every agent, workflow, tool, and foundation model action.</p>
      <section className="mt-6 space-y-3 text-gray-300">
        <p>Controls include tenant-scoped API requests, RLS-ready persistence, deployment protection compatibility, and structured risk analysis.</p>
        <p>Security issues should be reported through the enterprise support channel with affected org, route, timestamp, and reproduction details.</p>
      </section>
    </main>
  );
}

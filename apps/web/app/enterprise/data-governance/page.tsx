export default function DataGovernancePage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Data Governance</h1>
      <p className="mt-4 text-gray-300">HOARE.ai routes agent, tool, workflow, and foundation model operations through a governance aggregator before execution.</p>
      <ul className="mt-6 list-disc space-y-2 pl-6 text-gray-300">
        <li>Every governed action is metered and written to an org-scoped audit log.</li>
        <li>Unsafe actions are blocked before tool or model execution.</li>
        <li>Operational metrics and health checks expose governance posture continuously.</li>
      </ul>
    </main>
  );
}

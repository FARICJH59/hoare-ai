export default function SlaPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">Service Level Agreement</h1>
      <p className="mt-4 text-gray-300">HOARE.ai enterprise deployments are designed for monitored availability, health reporting, workflow durability, and auditable incident response.</p>
      <ul className="mt-6 list-disc space-y-2 pl-6 text-gray-300">
        <li>Health signals cover agent runtime, workflow engine, billing engine, governance, and DevOps risk.</li>
        <li>Metrics expose usage and reliability dimensions for operational review.</li>
        <li>Customer-specific uptime and support terms are governed by the executed order form.</li>
      </ul>
    </main>
  );
}

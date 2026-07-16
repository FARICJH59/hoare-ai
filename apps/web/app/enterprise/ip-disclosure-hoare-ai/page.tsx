export default function IpDisclosurePage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">HOARE.ai IP Disclosure</h1>
      <p className="mt-4 text-gray-300">HOARE.ai protects platform source, agent orchestration logic, governance policies, model-routing controls, and partner integration contracts as confidential intellectual property.</p>
      <ul className="mt-6 list-disc space-y-2 pl-6 text-gray-300">
        <li>Customer prompts, workflow data, and tenant metadata remain tenant-scoped.</li>
        <li>Generated artifacts inherit the customer contract and governance policy configured for the org.</li>
        <li>Partner SDKs expose stable contracts without disclosing protected internal orchestration logic.</li>
      </ul>
    </main>
  );
}

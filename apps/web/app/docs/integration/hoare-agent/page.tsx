export default function HoareAgentDocsPage() {
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold">HOARE Agent Integration</h1>
      <p className="mt-4 text-gray-300">Use /agent/run, /workflow/execute, /tools/invoke, and /foundation/generate with an authenticated request and org_id or x-org-id for tenant isolation.</p>
      <pre className="mt-6 overflow-x-auto rounded-lg bg-gray-950 p-4 text-sm text-gray-200">{`POST /agent/run
x-org-id: org_123
{ "message": "use_tool:energy.optimizeGrid" }`}</pre>
    </main>
  );
}

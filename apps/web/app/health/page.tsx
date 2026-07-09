const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchHealth() {
  try {
    const res = await fetch(`${API_URL}/health`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function HealthPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const health: any = await fetchHealth();

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">System Health</h1>
      {health ? (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 font-mono text-sm">
          <pre className="text-green-400">{JSON.stringify(health, null, 2)}</pre>
        </div>
      ) : (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-6 text-red-400">
          API unreachable — ensure the API server is running on{" "}
          <code>{API_URL}</code>
        </div>
      )}
    </main>
  );
}

async function fetchHealth() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/api/health`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    const body = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, body };
  } catch {
    return null;
  }
}

export default async function HealthPage() {
  const health = await fetchHealth();

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">System Health</h1>
      {health ? (
        <div
          className={`rounded-lg border p-6 font-mono text-sm ${
            health.ok ? "border-green-700 bg-green-950/20" : "border-yellow-700 bg-yellow-950/30"
          }`}
        >
          <p className={health.ok ? "mb-4 text-green-400" : "mb-4 text-yellow-300"}>
            Status {health.status}
          </p>
          <pre className="overflow-x-auto text-gray-100">{JSON.stringify(health.body, null, 2)}</pre>
        </div>
      ) : (
        <div className="rounded-lg border border-red-700 bg-red-900/20 p-6 text-red-400">
          Health endpoint unreachable.
        </div>
      )}
    </main>
  );
}

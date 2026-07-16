import { apiClient } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function AgentsPage() {
  const data = await apiClient.listAgents().catch(() => ({ count: 0, agents: [] }));

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Agents</h1>
      <p className="text-gray-400">
        Runtime agents and persisted agent records available to the platform.
      </p>
      <div className="mt-6 grid gap-4">
        {data.agents.length === 0 ? (
          <div className="rounded-lg border border-yellow-700 bg-yellow-950/40 p-6 text-yellow-100">
            No agents returned by the backend API. Check API auth and persistence configuration.
          </div>
        ) : (
          data.agents.map((agent) => (
            <section key={agent.id} className="rounded-lg border border-gray-700 bg-gray-900 p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">{agent.name}</h2>
                  <p className="mt-1 text-sm text-gray-400">{agent.description ?? "No description provided."}</p>
                </div>
                <span className="rounded-full border border-blue-700 px-3 py-1 text-xs text-blue-200">
                  {agent.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {agent.capabilities.map((capability) => (
                  <span key={capability} className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-300">
                    {capability}
                  </span>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </main>
  );
}

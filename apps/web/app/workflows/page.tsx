import { apiClient } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function WorkflowsPage() {
  const data = await apiClient
    .listWorkflows()
    .catch(() => ({ count: 0, workflows: [], recentJobs: [] }));

  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Workflows</h1>
      <p className="text-gray-400">
        Persisted workflow definitions and recent execution jobs from the backend runtime.
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Workflow Definitions</h2>
        <div className="mt-4 grid gap-4">
          {data.workflows.length === 0 ? (
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 text-gray-400">
              No persisted workflow definitions yet.
            </div>
          ) : (
            data.workflows.map((workflow) => (
              <div key={workflow.id} className="rounded-lg border border-gray-700 bg-gray-900 p-6">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{workflow.name}</h3>
                    <p className="mt-1 text-sm text-gray-400">{workflow.description ?? "No description provided."}</p>
                  </div>
                  <span className="rounded-full border border-blue-700 px-3 py-1 text-xs text-blue-200">
                    {workflow.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-gray-500">Steps: {workflow.stepCount}</p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Recent Execution Jobs</h2>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-700">
          {data.recentJobs.length === 0 ? (
            <div className="bg-gray-900 p-6 text-gray-400">No execution jobs yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-900 text-gray-400">
                <tr><th className="p-3">Tool</th><th className="p-3">Status</th><th className="p-3">Created</th></tr>
              </thead>
              <tbody>
                {data.recentJobs.map((job) => (
                  <tr key={job.id} className="border-t border-gray-800">
                    <td className="p-3">{job.toolName}</td>
                    <td className="p-3">{job.status}</td>
                    <td className="p-3 text-gray-500">{new Date(job.createdAt).toLocaleString()}</td>
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

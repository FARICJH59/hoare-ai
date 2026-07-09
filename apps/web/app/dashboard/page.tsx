export default function DashboardPage() {
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Active Agents", value: "–" },
          { label: "Workflows Run", value: "–" },
          { label: "API Requests", value: "–" },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-gray-700 bg-gray-900 p-6">
            <p className="text-sm text-gray-400">{label}</p>
            <p className="text-4xl font-bold mt-2 text-blue-400">{value}</p>
          </div>
        ))}
      </div>
    </main>
  );
}

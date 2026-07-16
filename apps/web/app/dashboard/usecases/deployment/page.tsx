const cards = ["Runtime", "Registry", "API", "Events"];

export default function Page() {
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <p className="text-sm uppercase tracking-wide text-blue-300">usecases.deployment</p>
      <h1 className="mt-2 text-3xl font-bold">Usecases Deployment</h1>
      <p className="mt-3 text-gray-400">Standalone HOARE.ai + Tech Fusion Grid UI scaffold for usecases.deployment capabilities.</p>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <section key={card} className="rounded-lg border border-gray-700 bg-gray-900 p-5">
            <h2 className="font-semibold text-white">{card}</h2>
            <p className="mt-2 text-sm text-gray-400">Namespace: <code>usecases.deployment.{card.toLowerCase()}</code></p>
          </section>
        ))}
      </div>
    </main>
  );
}

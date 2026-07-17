const cards = [
  { title: "Build Pack Detection Viewer", namespace: "buildpacks.detector", color: "var(--tf-holo-cyan)" },
  { title: "Build Pack Manifest Viewer", namespace: "buildpacks.manifest", color: "var(--tf-holo-violet)" },
  { title: "Build Pack Compiler Console", namespace: "buildpacks.compiler", color: "var(--tf-holo-lime)" },
  { title: "Build Pack Deployment Manager", namespace: "buildpacks.deployer", color: "var(--tf-holo-magenta)" },
  { title: "Environment Profile Viewer", namespace: "buildpacks.environments", color: "var(--tf-holo-gold)" },
];

const environments = ["dev", "staging", "production", "sovereign", "edge", "marketplace"];

export default function BuildpacksDashboardPage() {
  return (
    <main className="p-8 max-w-6xl mx-auto">
      <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">buildpacks.uabp</p>
      <h1 className="mt-2 text-3xl font-bold tf-holo-text">Unified Agentic Build Pack Engine</h1>
      <p className="mt-3 text-gray-300">Package HOARE.ai agents, workflows, tools, use cases, marketplace items, holographic UI, and quantum shaders into optional deployable UABP artifacts.</p>

      <section className="tf-holo-card mt-8 rounded-3xl border border-cyan-300/20 bg-black/35 p-6 backdrop-blur-xl">
        <h2 className="text-xl font-semibold">Tech Fusion Build Pack Status</h2>
        <p className="mt-2 text-sm text-gray-400">The orbiting Tech Fusion logo is provided by the dashboard layout and represents active UABP status.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {environments.map((environment) => <span key={environment} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-center text-sm text-cyan-100">{environment}</span>)}
        </div>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        {cards.map((card) => (
          <section key={card.namespace} className="tf-holo-card rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl" style={{ boxShadow: `0 0 28px ${card.color}33` }}>
            <h2 className="text-lg font-semibold">{card.title}</h2>
            <p className="mt-2 text-sm text-gray-400">Namespace: <code>{card.namespace}</code></p>
            <p className="mt-3 text-sm text-gray-300">Connected to `/buildpacks/*` APIs and the UABP manifest schema.</p>
          </section>
        ))}
      </div>
    </main>
  );
}

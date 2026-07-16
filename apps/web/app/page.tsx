import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-4">
          <span className="text-blue-400">HOARE</span>.ai
        </h1>
        <p className="text-xl text-gray-400 mb-8">
          Autonomous AI platform — agent runtime, workflow orchestration &amp; QGPS integration.
        </p>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-6 mb-12">
          {[
            { href: "/dashboard", label: "Dashboard" },
            { href: "/agents", label: "Agents" },
            { href: "/workflows", label: "Workflows" },
            { href: "/energy", label: "Energy" },
            { href: "/health", label: "Health" },
            { href: "/sign-in", label: "Sign in" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-sm font-medium hover:border-blue-500 hover:bg-gray-800 transition-colors"
            >
              {label} →
            </Link>
          ))}
        </div>

        <div className="text-xs text-gray-600">
          API: <code className="font-mono">{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000"}</code>
        </div>
      </div>
    </main>
  );
}

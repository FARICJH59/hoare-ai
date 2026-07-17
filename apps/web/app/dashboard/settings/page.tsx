import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ThemeController } from "../components/ThemeController";

const cards = [
  "i18n Language Selector",
  "Holographic Intensity Controller",
  "Quantum Particle Density Controller",
  "Logo Animation Controls",
  "Color Palette Selector",
];

export default function DashboardSettingsPage() {
  return (
    <main className="p-8 max-w-5xl mx-auto">
      <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">dashboard.settings</p>
      <h1 className="mt-2 text-3xl font-bold tf-holo-text">Global Dashboard Settings</h1>
      <p className="mt-3 text-gray-300">Control the Tech Fusion holographic dashboard experience without changing existing dashboard routes.</p>

      <div className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <section className="tf-holo-card rounded-2xl border border-cyan-300/20 bg-black/35 p-6 backdrop-blur-xl">
          <h2 className="text-lg font-semibold">i18n Language Selector</h2>
          <div className="mt-4"><LanguageSwitcher /></div>
        </section>
        <ThemeController />
        {cards.slice(1).map((card) => (
          <section key={card} className="tf-holo-card rounded-2xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl">
            <h2 className="text-lg font-semibold">{card}</h2>
            <p className="mt-2 text-sm text-gray-400">Managed by the dashboard theme controller.</p>
          </section>
        ))}
      </div>
    </main>
  );
}

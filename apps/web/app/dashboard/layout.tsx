import type { ReactNode } from "react";
import { I18nProvider } from "@/i18n/I18nProvider";
import { HolographicQuantumLayer } from "./components/HolographicQuantumLayer";
import { LanguageSwitcher } from "./components/LanguageSwitcher";
import { TechFusionLogo3D } from "./components/TechFusionLogo3D";
import { ThemeControllerProvider } from "./components/ThemeController";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ThemeControllerProvider>
        <div className="tf-dashboard-shell relative min-h-screen overflow-hidden bg-[var(--tf-quantum-black)] text-white">
          <HolographicQuantumLayer />
          <TechFusionLogo3D />
          <div className="fixed left-4 top-4 z-20"><LanguageSwitcher /></div>
          <div className="relative z-10">{children}</div>
        </div>
      </ThemeControllerProvider>
    </I18nProvider>
  );
}

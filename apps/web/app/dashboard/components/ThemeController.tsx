"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type PaletteMode = "quantum" | "aurora" | "solar";

type ThemeState = {
  holographicIntensity: number;
  particleDensity: number;
  logoOrbitSpeed: number;
  paletteMode: PaletteMode;
};

type ThemeContextValue = ThemeState & {
  setHolographicIntensity: (value: number) => void;
  setParticleDensity: (value: number) => void;
  setLogoOrbitSpeed: (value: number) => void;
  setPaletteMode: (value: PaletteMode) => void;
};

const ThemeControllerContext = createContext<ThemeContextValue | null>(null);

export function ThemeControllerProvider({ children }: { children: ReactNode }) {
  const [holographicIntensity, setHolographicIntensity] = useState(0.72);
  const [particleDensity, setParticleDensity] = useState(0.55);
  const [logoOrbitSpeed, setLogoOrbitSpeed] = useState(1);
  const [paletteMode, setPaletteMode] = useState<PaletteMode>("quantum");

  const value = useMemo(() => ({
    holographicIntensity,
    particleDensity,
    logoOrbitSpeed,
    paletteMode,
    setHolographicIntensity,
    setParticleDensity,
    setLogoOrbitSpeed,
    setPaletteMode,
  }), [holographicIntensity, particleDensity, logoOrbitSpeed, paletteMode]);

  return (
    <ThemeControllerContext.Provider value={value}>
      <div
        data-palette={paletteMode}
        style={{
          "--tf-holo-intensity": holographicIntensity,
          "--tf-particle-density": particleDensity,
          "--tf-logo-speed": logoOrbitSpeed,
        } as React.CSSProperties}
      >
        {children}
      </div>
    </ThemeControllerContext.Provider>
  );
}

export function useThemeController() {
  const context = useContext(ThemeControllerContext);
  if (!context) throw new Error("useThemeController must be used inside ThemeControllerProvider.");
  return context;
}

export function ThemeController() {
  const theme = useThemeController();

  return (
    <div className="tf-control-panel rounded-2xl border border-cyan-300/20 bg-black/35 p-4 shadow-2xl backdrop-blur-xl">
      <label className="block text-xs uppercase tracking-[0.22em] text-cyan-200">Holographic Intensity</label>
      <input className="mt-2 w-full accent-cyan-300" type="range" min="0" max="1" step="0.05" value={theme.holographicIntensity} onChange={(event) => theme.setHolographicIntensity(Number(event.target.value))} />

      <label className="mt-4 block text-xs uppercase tracking-[0.22em] text-lime-200">Particle Density</label>
      <input className="mt-2 w-full accent-lime-300" type="range" min="0" max="1" step="0.05" value={theme.particleDensity} onChange={(event) => theme.setParticleDensity(Number(event.target.value))} />

      <label className="mt-4 block text-xs uppercase tracking-[0.22em] text-violet-200">Logo Orbit Speed</label>
      <input className="mt-2 w-full accent-violet-300" type="range" min="0.2" max="2" step="0.1" value={theme.logoOrbitSpeed} onChange={(event) => theme.setLogoOrbitSpeed(Number(event.target.value))} />

      <label className="mt-4 block text-xs uppercase tracking-[0.22em] text-yellow-200">Palette Mode</label>
      <select className="mt-2 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-sm text-white" value={theme.paletteMode} onChange={(event) => theme.setPaletteMode(event.target.value as PaletteMode)}>
        <option value="quantum">Quantum</option>
        <option value="aurora">Aurora</option>
        <option value="solar">Solar</option>
      </select>
    </div>
  );
}

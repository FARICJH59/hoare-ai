"use client";

import { useMemo } from "react";
import { useThemeController } from "./ThemeController";

function QuantumGrid() {
  return <div className="tf-quantum-grid" aria-hidden="true" />;
}

function QuantumParticles() {
  const particles = useMemo(() => Array.from({ length: 42 }, (_, index) => ({
    id: index,
    left: `${(index * 37) % 100}%`,
    top: `${(index * 19) % 100}%`,
    delay: `${(index % 11) * -0.37}s`,
    size: `${2 + (index % 5)}px`,
  })), []);

  return (
    <div className="tf-quantum-particles" aria-hidden="true">
      {particles.map((particle) => (
        <span key={particle.id} style={{ left: particle.left, top: particle.top, animationDelay: particle.delay, width: particle.size, height: particle.size }} />
      ))}
    </div>
  );
}

function QuantumShimmer() {
  return <div className="tf-quantum-shimmer" aria-hidden="true" />;
}

function QuantumBloom() {
  return <div className="tf-quantum-bloom" aria-hidden="true" />;
}

export function HolographicQuantumLayer() {
  const { holographicIntensity, particleDensity } = useThemeController();

  return (
    <div
      className="tf-r3f-canvas tf-holographic-layer pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-label="R3F Canvas compatible holographic quantum scene"
      style={{ opacity: 0.28 + holographicIntensity * 0.42, filter: `saturate(${1 + holographicIntensity})` }}
    >
      <canvas className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <QuantumGrid />
      <div style={{ opacity: 0.35 + particleDensity * 0.65 }}><QuantumParticles /></div>
      <QuantumShimmer />
      <QuantumBloom />
    </div>
  );
}

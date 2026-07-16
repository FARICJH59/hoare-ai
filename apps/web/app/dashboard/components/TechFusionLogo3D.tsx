"use client";

import { useEffect, useRef } from "react";
import { useThemeController } from "./ThemeController";

const rotationSpeed = 0.4;
const orbitRadius = 1.4;

export function TechFusionLogo3D() {
  const { logoOrbitSpeed } = useThemeController();
  const orbitRef = useRef<HTMLDivElement | null>(null);
  const logoRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let frame = 0;
    const startedAt = performance.now();

    function animate(now: number) {
      const time = ((now - startedAt) / 1000) * logoOrbitSpeed;
      const glow = (Math.sin(time * 1.2) + 1) / 2;
      const dim = (Math.cos(time * 0.8) + 1) / 2;
      const x = Math.cos(time) * orbitRadius;
      const z = Math.sin(time) * orbitRadius;

      if (orbitRef.current) {
        orbitRef.current.style.transform = `translate3d(${x}rem, 0, ${z}rem)`;
      }
      if (logoRef.current) {
        logoRef.current.style.transform = `rotateY(${time * rotationSpeed}rad)`;
        logoRef.current.style.opacity = String(0.72 + dim * 0.28);
        logoRef.current.style.filter = `drop-shadow(0 0 ${14 + glow * 26}px rgba(59, 245, 255, ${0.35 + glow * 0.45}))`;
      }

      frame = requestAnimationFrame(animate);
    }

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [logoOrbitSpeed]);

  return (
    <div className="pointer-events-none fixed right-8 top-24 z-20 hidden h-28 w-28 md:block" aria-label="Tech Fusion AI/ML 3D holographic logo">
      <div ref={orbitRef} className="tf-logo-orbit">
        <div ref={logoRef} className="tf-logo-3d">
          <span className="tf-logo-core">TF</span>
          <span className="tf-logo-ring tf-logo-ring-a" />
          <span className="tf-logo-ring tf-logo-ring-b" />
          <span className="tf-logo-node tf-logo-node-a" />
          <span className="tf-logo-node tf-logo-node-b" />
        </div>
      </div>
    </div>
  );
}

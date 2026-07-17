"use client";

import { Bloom, ChromaticAberration, DepthOfField, EffectComposer } from "@react-three/postprocessing";
import type React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { BlendFunction } from "postprocessing";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThemeController } from "./ThemeController";

const holographicPerformance = { targetFps: 45, minParticleDensity: 0.18, maxParticleDensity: 0.72, lowPowerParticleDensity: 0.22, maxGpuLoadThreshold: 0.78 } as const;

function QuantumGrid({ intensity }: { intensity: number }) {
  const gridRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!gridRef.current) return;
    gridRef.current.position.z = (clock.elapsedTime * 0.18) % 1;
    gridRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.04;
  });

  return (
    <mesh ref={gridRef} rotation={[-Math.PI / 2.8, 0, 0]} position={[0, -1.2, 0]}>
      <planeGeometry args={[18, 18, 48, 48]} />
      <meshBasicMaterial color="#3BF5FF" wireframe transparent opacity={0.1 + intensity * 0.22} />
    </mesh>
  );
}

function QuantumParticles({ density }: { density: number }) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = Math.max(64, Math.round(220 * density));
  const positions = useMemo(() => {
    const values = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      values[index * 3] = ((index * 37) % 120) / 10 - 6;
      values[index * 3 + 1] = ((index * 19) % 70) / 10 - 2.4;
      values[index * 3 + 2] = ((index * 53) % 120) / 10 - 6;
    }
    return values;
  }, [particleCount]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = clock.elapsedTime * 0.025;
    pointsRef.current.position.y = Math.sin(clock.elapsedTime * 0.7) * 0.08;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#A8FF3B" size={0.035} transparent opacity={0.45 + density * 0.35} depthWrite={false} />
    </points>
  );
}

function QuantumShimmer({ intensity }: { intensity: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = clock.elapsedTime * 0.12;
    meshRef.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.6) * 0.035);
  });

  return (
    <mesh ref={meshRef} position={[0, 0.2, -1.4]}>
      <torusKnotGeometry args={[1.15, 0.012, 128, 8]} />
      <meshBasicMaterial color="#FF3BCE" transparent opacity={0.08 + intensity * 0.14} />
    </mesh>
  );
}

function FpsGovernor({ onScaleChange }: { onScaleChange: (scale: number) => void }) {
  const samples = useRef<number[]>([]);

  useFrame((_state, delta) => {
    const fps = 1 / Math.max(delta, 0.001);
    samples.current.push(fps);
    if (samples.current.length < 30) return;
    const average = samples.current.reduce((sum, value) => sum + value, 0) / samples.current.length;
    samples.current = [];
    onScaleChange(average < holographicPerformance.targetFps ? 0.72 : 1);
  });

  return null;
}

function QuantumBloom({ intensity }: { intensity: number }) {
  const chromaticOffset = useMemo(() => new THREE.Vector2(0.0015 + intensity * 0.001, 0.0012 + intensity * 0.001), [intensity]);

  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.35 + intensity * 0.8} luminanceThreshold={0.15} luminanceSmoothing={0.72} mipmapBlur />
      <ChromaticAberration blendFunction={BlendFunction.NORMAL} offset={chromaticOffset} radialModulation={false} modulationOffset={0} />
      <DepthOfField focusDistance={0.018} focalLength={0.025 + intensity * 0.01} bokehScale={1.2 + intensity * 1.8} />
    </EffectComposer>
  );
}

export function HolographicQuantumLayer() {
  const { holographicIntensity, particleDensity } = useThemeController();
  const [fpsScale, setFpsScale] = useState(1);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(media.matches);
    const update = () => setPrefersReducedMotion(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const effectiveParticleDensity = prefersReducedMotion
    ? holographicPerformance.lowPowerParticleDensity
    : Math.min(holographicPerformance.maxParticleDensity, Math.max(holographicPerformance.minParticleDensity, particleDensity * fpsScale));

  return (
    <div
      className="tf-r3f-canvas tf-holographic-layer pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-label="R3F Canvas holographic quantum scene"
      style={{ opacity: 0.28 + holographicIntensity * 0.42, filter: `saturate(${1 + holographicIntensity})`, "--tf-gpu-load-threshold": holographicPerformance.maxGpuLoadThreshold } as React.CSSProperties}
    >
      <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.2, 5.2], fov: 52 }} gl={{ antialias: false, powerPreference: "high-performance", alpha: true }}>
        <color attach="background" args={["#02040A"]} />
        <fog attach="fog" args={["#02040A", 5, 12]} />
        <QuantumGrid intensity={holographicIntensity} />
        <QuantumParticles density={effectiveParticleDensity} />
        <FpsGovernor onScaleChange={setFpsScale} />
        <QuantumShimmer intensity={holographicIntensity} />
        <QuantumBloom intensity={holographicIntensity} />
      </Canvas>
    </div>
  );
}

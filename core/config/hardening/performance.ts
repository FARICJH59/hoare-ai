export const performanceHardening = {
  cacheTtlMs: 5_000,
  holographic: {
    targetFps: 45,
    minParticleDensity: 0.18,
    maxParticleDensity: 0.72,
    lowPowerParticleDensity: 0.22,
    maxGpuLoadThreshold: 0.78,
    dpr: [1, 1.5] as [number, number],
  },
} as const;

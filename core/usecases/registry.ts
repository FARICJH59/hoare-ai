
import type { ListResult, PhaseEntity } from "../types";
export const usecases: PhaseEntity[] = [
  { id: "usecases.grid-optimization", namespace: "usecases.registry", name: "Grid Optimization", description: "Optimize grid operations through HOARE.ai and Tech Fusion Grid UI." },
  { id: "usecases.dr-simulation", namespace: "usecases.registry", name: "DR Simulation", description: "Simulate demand-response events." },
];
export function listUseCases(): ListResult<PhaseEntity> { return { namespace: "usecases.registry", count: usecases.length, items: usecases }; }

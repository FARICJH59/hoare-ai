
import type { ListResult, PhaseEntity } from "../types";

export const domains: PhaseEntity[] = [
  { id: "domain.grid", namespace: "domain.registry", name: "Grid", description: "Grid optimization and orchestration." },
  { id: "domain.dr", namespace: "domain.registry", name: "Demand Response", description: "Demand response simulation and execution." },
  { id: "domain.iot", namespace: "domain.registry", name: "IoT", description: "Device orchestration and telemetry." },
  { id: "domain.sustainability", namespace: "domain.registry", name: "Sustainability", description: "Sustainability scoring and reporting." },
  { id: "domain.forecast", namespace: "domain.registry", name: "Forecast", description: "Forecast scenario analysis." },
];

export function listDomains(): ListResult<PhaseEntity> { return { namespace: "domain.registry", count: domains.length, items: domains }; }
export function getDomainMetadata(domain = "grid") { return domains.find((item) => item.id.endsWith(domain) || item.name.toLowerCase() === domain) ?? domains[0]; }

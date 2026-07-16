
import type { ListResult, PhaseEntity } from "../types";

export const riskModels: PhaseEntity[] = [
  { id: "risk.model.operational", namespace: "risk.models", name: "Operational Risk", description: "Scores execution risk from impact, domain, and safety metadata." },
  { id: "risk.model.grid-anomaly", namespace: "risk.models", name: "Grid Anomaly", description: "Flags anomalous grid or demand-response requests." },
];

export function listRiskModels(): ListResult<PhaseEntity> {
  return { namespace: "risk.models", count: riskModels.length, items: riskModels };
}

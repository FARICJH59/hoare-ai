
import type { ExecutionRequest } from "../types";
import { publishEvent } from "../events/bus";

export function evaluateRisk(request: ExecutionRequest) {
  const impact = Number(request.input?.impact ?? 1);
  const score = Math.max(0, Math.min(100, impact * 20));
  const anomaly = score >= 80;
  if (anomaly) publishEvent("risk.anomaly.detected", { score, reason: "high-impact" }, request.domain);
  return { namespace: "risk.engine", score, level: score >= 80 ? "high" : score >= 50 ? "medium" : "low", anomaly };
}

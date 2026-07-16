
import type { ExecutionRequest } from "../types";
import { publishEvent } from "../events/bus";

export function evaluateSafety(request: ExecutionRequest) {
  const action = String(request.input?.action ?? "").toLowerCase();
  const blocked = action.includes("delete") || action.includes("shutdown");
  if (blocked) publishEvent("safety.blocked", { action, reason: "destructive-action" }, request.domain);
  return { namespace: "safety.engine", allowed: !blocked, reason: blocked ? "destructive-action" : "allowed" };
}

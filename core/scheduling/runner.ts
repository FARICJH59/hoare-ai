import { reliabilityHardening } from "../config/hardening/reliability";
import { publishEvent } from "../events/bus";

export function runDueTasks() {
  publishEvent("scheduling.task.executed", { checkedAt: new Date().toISOString(), missedTaskGraceMs: reliabilityHardening.missedTaskGraceMs });
  return { namespace: "scheduling.runner", status: "completed", executed: 0, missedTaskGraceMs: reliabilityHardening.missedTaskGraceMs };
}

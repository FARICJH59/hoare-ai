
import { createId, type JsonRecord } from "../types";
import { publishEvent } from "../events/bus";
import { registerTask, cancelTask } from "./registry";

export function scheduleTask(task: JsonRecord) {
  const saved = registerTask({ id: createId("schedule"), status: "scheduled", ...task });
  publishEvent("scheduling.task.scheduled", { task: saved });
  return { namespace: "scheduling.engine", status: "scheduled", task: saved };
}

export function cancelScheduledTask(id: string) {
  const task = cancelTask(id);
  publishEvent("scheduling.task.cancelled", { id });
  return { namespace: "scheduling.engine", status: task ? "completed" : "failed", task };
}

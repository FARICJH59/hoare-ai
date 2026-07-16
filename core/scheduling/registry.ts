
import type { JsonRecord } from "../types";
const tasks: JsonRecord[] = [];
export function registerTask(task: JsonRecord) { tasks.push({ namespace: "scheduling.registry", ...task }); return tasks[tasks.length - 1]; }
export function listTasks() { return { namespace: "scheduling.registry", count: tasks.length, items: tasks }; }
export function cancelTask(id: string) { const task = tasks.find((item) => item.id === id); if (task) task.status = "cancelled"; return task ?? null; }

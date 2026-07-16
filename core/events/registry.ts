
import type { ListResult, PhaseEntity } from "../types";

export const eventTypes: PhaseEntity[] = [
  { id: "agent.started", namespace: "events.registry", name: "agent.started", description: "Agent execution started." },
  { id: "agent.completed", namespace: "events.registry", name: "agent.completed", description: "Agent execution completed." },
  { id: "agent.failed", namespace: "events.registry", name: "agent.failed", description: "Agent execution failed." },
  { id: "workflow.started", namespace: "events.registry", name: "workflow.started", description: "Workflow execution started." },
  { id: "workflow.completed", namespace: "events.registry", name: "workflow.completed", description: "Workflow execution completed." },
  { id: "tool.executed", namespace: "events.registry", name: "tool.executed", description: "Tool execution completed." },
  { id: "safety.blocked", namespace: "events.registry", name: "safety.blocked", description: "Safety engine blocked execution." },
  { id: "risk.anomaly.detected", namespace: "events.registry", name: "risk.anomaly.detected", description: "Risk engine detected an anomaly." },
];

export function listEventTypes(): ListResult<PhaseEntity> {
  return { namespace: "events.registry", count: eventTypes.length, items: eventTypes };
}
